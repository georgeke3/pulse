import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { cloud, useCloudSession } from '../cloudClient';
import type { EventType } from '../types';
import { DEFAULT_CONFIG, useApp } from '../store';
import { catArt } from './catArt';
import { WIN_ICON, iconSrc } from './icons';

/** A circle on the Present tab. Never deleted, only archived (past logs keep pointing at its name). */
export type StimType = Exclude<EventType, 'win'>;
export interface Stimulus { id: string; name: string; type: StimType; icon: string; short?: string; shown: boolean; archived: boolean; ord: number; u: number }

const KEY = 'omokage_stimuli_v1', TABLE = 'omokage_stimuli';
const SEED_ICON: Record<string, string> = { 'presence check': 'presence' };
const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const seedIcon = (type: StimType, name: string) => {
  const k = SEED_ICON[name.toLowerCase()] ?? name.trim().split(/\s+/)[0].toLowerCase();
  return type === 'recovery' && k === 'family' ? 'family-rest' : iconSrc(k) ? k : 'mono';
};
/** First run: the circles that used to be hard-coded. Ids are deterministic so two devices seeding offline merge instead of doubling. */
const seeds = (): Stimulus[] => (['training', 'recovery'] as const).flatMap(type =>
  DEFAULT_CONFIG.categories[type].map((name, i) => ({ id: `seed-${type}-${slug(name)}`, name, type, icon: seedIcon(type, name), shown: true, archived: false, ord: i, u: 0 })));

const load = (): Stimulus[] | null => { try { const r = localStorage.getItem(KEY); return r ? (JSON.parse(r) as Stimulus[]) : null; } catch { return null; } };
const byOrd = (a: Stimulus, b: Stimulus) => a.ord - b.ord || a.name.localeCompare(b.name);
const toRow = (s: Stimulus) => ({ id: s.id, name: s.name, type: s.type, icon: s.icon, short: s.short ?? null, shown: s.shown, archived: s.archived, ord: s.ord, u: s.u });
const merge = (a: Stimulus[], b: Stimulus[]) => { const m = new Map<string, Stimulus>(); for (const s of [...a, ...b]) { const o = m.get(s.id); if (!o || s.u > o.u) m.set(s.id, s); } return [...m.values()]; };

/** Short label for the ring: the first word of the name, trimmed. Overridable per stimulus. */
export const labelOf = (s: { name: string; short?: string }) => (s.short?.trim() || s.name.trim().split(/\s+/)[0]).slice(0, 10);
export const monoOf = (name: string) => (name.trim()[0] ?? '?').toUpperCase();
export const sameName = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();

interface Ctx {
  all: Stimulus[];                                  // every stimulus, ordered
  active: Stimulus[];                               // not archived
  ring: (type: StimType) => Stimulus[];             // shown + not archived, in ring order
  find: (type: EventType, name: string) => Stimulus | undefined;
  art: (type: EventType, name: string) => string | undefined;
  add: (p: { name: string; type: StimType; icon: string; short?: string }) => string | null;   // null = name already used
  edit: (id: string, p: Partial<Pick<Stimulus, 'name' | 'icon' | 'short'>>) => string | null;
  setShown: (ids: string[], shown: boolean) => void;
  setArchived: (id: string, archived: boolean) => void;
}
const C = createContext<Ctx | null>(null);

export const StimuliProvider = ({ children }: { children: ReactNode }) => {
  const { renameCategory } = useApp();
  const [all, setAll] = useState<Stimulus[]>(() => load() ?? seeds());
  const ref = useRef(all); ref.current = all;
  const uid = useCloudSession()?.user.id;
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(all)); } catch { /* quota */ } }, [all]);

  const push = useCallback((rows: Stimulus[]) => {
    if (!cloud || !uid || !rows.length) return;
    cloud.request('POST', TABLE, { query: { on_conflict: 'user_id,id' }, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: rows.map(r => ({ ...toRow(r), user_id: uid })) }).catch(e => console.error('stimuli push', e));
  }, [uid]);

  // on sign-in: merge with the server copy (newest edit per stimulus wins), then upload whatever the server lacks
  useEffect(() => {
    if (!cloud || !uid) return;
    let dead = false;
    (async () => {
      try {
        const rows = (await cloud.request('GET', TABLE, { query: { select: '*', limit: '1000' } })) as Array<Record<string, unknown>> | null;
        if (dead) return;
        const server = (rows ?? []).map(r => ({ id: String(r.id), name: String(r.name), type: r.type as StimType, icon: String(r.icon ?? 'mono'), short: (r.short as string | null) ?? undefined, shown: !!r.shown, archived: !!r.archived, ord: Number(r.ord ?? 0), u: Number(r.u ?? 0) } as Stimulus));
        const merged = merge(server, ref.current);
        const sm = new Map(server.map(s => [s.id, s.u]));
        push(merged.filter(s => !sm.has(s.id) || (sm.get(s.id) ?? 0) < s.u));
        setAll(merged);
      } catch (e) { console.error('stimuli sync', e); }
    })();
    return () => { dead = true; };
  }, [uid, push]);

  const commit = useCallback((next: Stimulus[], changed: Stimulus[]) => { setAll(next); push(changed); }, [push]);
  const stamp = (s: Stimulus): Stimulus => ({ ...s, u: Date.now() });

  const add: Ctx['add'] = ({ name, type, icon, short }) => {
    const nm = name.trim(); if (!nm) return null;
    if (ref.current.some(s => s.type === type && sameName(s.name, nm))) return null;
    const ord = Math.max(-1, ...ref.current.filter(s => s.type === type).map(s => s.ord)) + 1;
    const s = stamp({ id: crypto.randomUUID(), name: nm, type, icon, short: short?.trim() || undefined, shown: true, archived: false, ord, u: 0 });
    commit([...ref.current, s], [s]); return s.id;
  };
  const edit: Ctx['edit'] = (id, p) => {
    const cur = ref.current.find(s => s.id === id); if (!cur) return null;
    const nm = p.name?.trim() ?? cur.name;
    if (!nm || ref.current.some(s => s.id !== id && s.type === cur.type && sameName(s.name, nm))) return null;
    if (nm !== cur.name) renameCategory(cur.type, cur.name, nm);     // past logs follow the new name
    const n = stamp({ ...cur, ...p, name: nm, short: (p.short ?? cur.short)?.trim() || undefined });
    commit(ref.current.map(s => (s.id === id ? n : s)), [n]); return id;
  };
  const setShown: Ctx['setShown'] = (ids, shown) => {
    const set = new Set(ids), changed: Stimulus[] = [];
    const next = ref.current.map(s => { if (!set.has(s.id) || s.shown === shown) return s; const n = stamp({ ...s, shown }); changed.push(n); return n; });
    if (changed.length) commit(next, changed);
  };
  const setArchived: Ctx['setArchived'] = (id, archived) => {
    const cur = ref.current.find(s => s.id === id); if (!cur || cur.archived === archived) return;
    const n = stamp({ ...cur, archived, shown: archived ? false : true });     // restoring puts it back on the ring
    commit(ref.current.map(s => (s.id === id ? n : s)), [n]);
  };

  const v = useMemo<Ctx>(() => {
    const sorted = [...all].sort(byOrd), active = sorted.filter(s => !s.archived);
    const idx = new Map(sorted.map(s => [`${s.type}|${s.name.toLowerCase()}`, s]));
    const find: Ctx['find'] = (type, name) => (type === 'win' ? undefined : idx.get(`${type}|${name.toLowerCase()}`));
    return {
      all: sorted, active, ring: type => active.filter(s => s.type === type && s.shown), find,
      art: (type, name) => { if (type === 'win') return WIN_ICON; const s = find(type, name); return s ? iconSrc(s.icon) : catArt(type, name); },
      add, edit, setShown, setArchived,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all]);
  return <C.Provider value={v}>{children}</C.Provider>;
};
export const useStimuli = () => { const c = useContext(C); if (!c) throw new Error('StimuliProvider missing'); return c; };
