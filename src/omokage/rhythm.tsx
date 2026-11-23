// The rhythm engine: how often each anchor question wants an answer, and whether it is due. Nothing here is a checkbox. Done-ness
// is derived from your answers, so syncing can never disagree with itself. Only your own adjustments are stored (a changed
// cadence, a "too soon" / "not relevant" nudge to the due date).
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cloud, useCloudSession } from '../cloudClient';
import { ANCHORS, type Anchor, type Tier } from './anchors';
import { dstr, fromDstr, todayStr } from './skins';

export const TIER_DAYS: Record<Tier, number> = { Q: 91, H: 182, Y: 365 };
export const TIER_LABEL: Record<Tier, string> = { Q: 'every 3 months', H: 'twice a year', Y: 'once a year' };
const NEXT: Record<Tier, Tier> = { Q: 'H', H: 'Y', Y: 'Y' };

/** `due`/`soon` are a nudge made on day `at`; they only count until the next answer after that day */
export interface RState { tier?: Tier; due?: string; at?: string; soon?: number; skips?: string[]; u: number }
type Book = Record<string, RState>;
export type Phase = 'later' | 'due' | 'late';
export interface Status { a: Anchor; tier: Tier; last: string | null; due: string; phase: Phase; late: number; soon: number; suggest: boolean }

const addDays = (d: string, n: number) => { const t = fromDstr(d); t.setDate(t.getDate() + n); return dstr(t); };
const diff = (a: string, b: string) => Math.round((fromDstr(a).getTime() - fromDstr(b).getTime()) / 864e5);
/** the next Dec 26 on or after `from` (the yearly look-back window opens then and runs to Jan 7) */
const nextNewYear = (from: string) => { const y = +from.slice(0, 4); const c = `${y}-12-26`; return c >= from ? c : `${y + 1}-12-26`; };

/** Where an anchor's first due date falls, so a tier's questions are spread across its interval instead of all arriving together. */
const slot = (a: Anchor) => {
  const mates = ANCHORS.filter(x => x.tier === a.tier), i = mates.findIndex(x => x.id === a.id), n = mates.length;
  return Math.floor(TIER_DAYS[a.tier] * ((i * 5) % n) / n);
};

/** Pure: when is this anchor due, and in what state? `last` is the day of its latest answer. */
export const statusOf = (a: Anchor, last: string | null, rs: RState | undefined, today: string, epoch: string): Status => {
  const tier = rs?.tier ?? a.tier;
  let due: string;
  const live = !!rs?.at && (!last || rs.at > last);                              // a nudge made after the latest answer is still in force
  if (live && rs?.due) due = rs.due;
  else if (last) due = tier === 'Y' ? nextNewYear(addDays(last, 180)) : addDays(last, TIER_DAYS[tier]);
  else due = tier === 'Y' ? nextNewYear(epoch) : addDays(epoch, slot({ ...a, tier }));
  const late = diff(today, due), phase: Phase = late < 0 ? 'later' : late > 14 ? 'late' : 'due';
  const soon = live ? rs?.soon ?? 0 : 0;
  return { a, tier, last, due, phase, late, soon, suggest: soon >= 2 && tier !== 'Y' };
};

interface Ctx {
  /** every anchor's status given your answers (qid → last day answered) */
  statuses: (lastBy: Map<string, string>) => Status[];
  tooSoon: (id: string) => void;
  notRelevant: (id: string) => void;
  setTier: (id: string, t: Tier) => void;
  lessOften: (id: string) => void;
  epoch: string;
}
const C = createContext<Ctx | null>(null);
const KEY = 'omk_rhythm_v1', EP = 'omk_rhythm_epoch', TABLE = 'omokage_rhythm';
const loadBook = (): Book => { try { return JSON.parse(localStorage.getItem(KEY) || '{}'); } catch { return {}; } };
const loadEpoch = () => { try { return localStorage.getItem(EP) || ''; } catch { return ''; } };

export const RhythmProvider = ({ children }: { children: ReactNode }) => {
  const [book, setBook] = useState<Book>(loadBook);
  const [epoch, setEpoch] = useState<string>(() => { const e = loadEpoch(); if (e) return e; const t = todayStr(); try { localStorage.setItem(EP, t); } catch { /* private mode */ } return t; });
  const ref = useRef(book); ref.current = book;
  const lastRef = useRef<Map<string, string>>(new Map());
  const lastOf = (id: string) => lastRef.current.get(id);
  const uid = useCloudSession()?.user.id;
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(book)); } catch { /* quota */ } }, [book]);
  useEffect(() => { try { localStorage.setItem(EP, epoch); } catch { /* quota */ } }, [epoch]);

  const push = useCallback((rows: { id: string; data: unknown; u: number }[]) => {
    if (!cloud || !uid || !rows.length) return;
    cloud.request('POST', TABLE, { query: { on_conflict: 'user_id,id' }, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: rows.map(r => ({ ...r, user_id: uid })) }).catch(e => console.error('rhythm push', e));
  }, [uid]);

  // on sign-in: merge with the server copy (newest nudge per question wins; the earliest start date wins so every device agrees)
  useEffect(() => {
    if (!cloud || !uid) return;
    let dead = false;
    (async () => {
      try {
        const rows = (await cloud.request('GET', TABLE, { query: { select: '*', limit: '1000' } })) as Array<{ id: string; data: { d?: string } & Partial<RState>; u: number }> | null;
        if (dead) return;
        const srv = new Map((rows ?? []).map(r => [r.id, r]));
        const ep = srv.get('_epoch')?.data?.d;
        const mine = loadEpoch() || todayStr();
        const best = ep && ep < mine ? ep : mine;
        const out: { id: string; data: unknown; u: number }[] = [];
        if (!ep || ep !== best) out.push({ id: '_epoch', data: { d: best }, u: Date.now() });
        const merged: Book = { ...ref.current };
        for (const [id, r] of srv) { if (id === '_epoch') continue; const l = merged[id]; if (!l || (l.u ?? 0) < (r.u ?? 0)) merged[id] = { ...(r.data as RState), u: r.u }; }
        for (const [id, l] of Object.entries(merged)) { const r = srv.get(id); if (!r || (r.u ?? 0) < l.u) out.push({ id, data: l, u: l.u }); }
        push(out); setEpoch(best); setBook(merged);
      } catch (e) { console.error('rhythm sync', e); }
    })();
    return () => { dead = true; };
  }, [uid, push]);

  const write = useCallback((id: string, f: (cur: RState | undefined) => RState) => {
    const n = { ...f(ref.current[id]), u: Date.now() };
    setBook(b => ({ ...b, [id]: n })); push([{ id, data: n, u: n.u }]);
  }, [push]);

  const v = useMemo<Ctx>(() => ({
    epoch,
    statuses: lastBy => { lastRef.current = lastBy; return ANCHORS.map(a => statusOf(a, lastBy.get(a.id) ?? null, book[a.id], todayStr(), epoch)); },
    // "too soon": the next ask comes about half an interval from today; two in a row offers a gentler cadence
    tooSoon: id => write(id, cur => { const a = ANCHORS.find(x => x.id === id)!, t = cur?.tier ?? a.tier; const td = todayStr(), keep = !!cur?.at && (!lastOf(id) || cur.at > lastOf(id)!); return { ...cur, due: addDays(td, Math.round(TIER_DAYS[t] / 2)), at: td, soon: (keep ? cur?.soon ?? 0 : 0) + 1, u: 0 }; }),
    // "not relevant": skips this round (a full interval out). The cadence itself never changes.
    notRelevant: id => write(id, cur => { const a = ANCHORS.find(x => x.id === id)!, t = cur?.tier ?? a.tier; const td = todayStr(); return { ...cur, due: t === 'Y' ? nextNewYear(addDays(td, 180)) : addDays(td, TIER_DAYS[t]), at: td, soon: 0, skips: [...(cur?.skips ?? []), td], u: 0 }; }),
    setTier: (id, t) => write(id, cur => ({ ...cur, tier: t, due: undefined, at: undefined, soon: 0, u: 0 })),
    lessOften: id => write(id, cur => { const a = ANCHORS.find(x => x.id === id)!; return { ...cur, tier: NEXT[cur?.tier ?? a.tier], due: undefined, at: undefined, soon: 0, u: 0 }; }),
  }), [book, epoch, write]);
  return <C.Provider value={v}>{children}</C.Provider>;
};
export const useRhythm = () => { const c = useContext(C); if (!c) throw new Error('RhythmProvider missing'); return c; };
