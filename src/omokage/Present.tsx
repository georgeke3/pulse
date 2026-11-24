import { subjectiveFor } from '../intensity';
import { isStim, isText, sleepReserve } from './special';
import { wisp } from './wisp';
import { TabMark, Sym } from './Sym';
import { useNavState } from './nav';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import { BalanceChip } from './Balance';
import type { Duration, Event } from '../types';
import { Fly } from './Art';
import { Circles } from './Circles';
import { layout } from './layout';
import { labelOf, monoOf, useStimuli } from './stimuli';
import { WIN_ICON } from './icons';
import { haptic } from './haptics';
import { Art, EventCard, TodayList, evOrder, evStart } from './Instances';
import { More } from './More';
import { LogSheet, RIM, beadX, type Cell, type Draft } from './LogSheet';
import { EMBER, GOLD, INK, INK2, SKY, fmtMin, fromDstr, hhmm, todayStr } from './skins';
import { heat, loadOf, sideTotal } from './load';

interface Toast { text: string; undo?: { cat: string; type: Event['type']; time: string } }
interface Burst { id: number; x: number; y: number; color: string }
interface Drag { x: number; k0: number; lvl: number; w: number }

const evMin = evStart;
const useSize = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [s, setS] = useState({ w: 345, h: 380 });
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const f = () => setS({ w: el.clientWidth, h: el.clientHeight });
    f(); const ro = new ResizeObserver(f); ro.observe(el); return () => ro.disconnect();
  }, []);
  return [ref, s] as const;
};

/** The day's ring. `day` is today unless Home opened an earlier day; then a bar at the top leads back to today. */
export const Present = ({ day, onExitDay, onDump, onPulse, onBalance }: { day: string; onExitDay: () => void; onDump: () => void; onPulse: () => void; onBalance: () => void }) => {
  const { state, addEvent, updateEvent, deleteEvent } = useApp();
  const today = day, isToday = day === todayStr();
  const told = !!state.days[day]?.note?.trim();
  const events = state.days[today]?.events ?? [];
  const timed = events.filter(e => evMin(e) !== null).sort((a, b) => evOrder(a)! - evOrder(b)!);
  const last = timed.length ? timed[timed.length - 1] : null;
  const answered = Object.keys(state.days[today]?.answers ?? {}).length, nq = state.config.daily_questions.length;

  const stim = useStimuli();
  // pinned circles live on the ring; an unpinned one that was logged today joins it as a guest (at the end of its side, so pinned ones never move)
  const isSleepName = (x: { name: string }) => x.name.trim().toLowerCase() === 'sleep';   // Sleep is a special circle now
  const usedToday = (x: { id: string; name: string; type: string }) => events.some(e => (e.custom_data?.sid ? e.custom_data.sid === x.id : e.type === x.type && e.category === x.name));
  const guestIds = new Set(stim.active.filter(x => !x.shown && !isSleepName(x) && usedToday(x)).map(x => x.id));
  const sideOf = (t: 'training' | 'recovery') => [...stim.ring(t).filter(x => !isSleepName(x)), ...stim.active.filter(x => x.type === t && guestIds.has(x.id))];
  const loadS = sideOf('training'), restS = sideOf('recovery');
  const moreS = stim.active.filter(x => !x.shown && !isSleepName(x) && !guestIds.has(x.id));
  const cells: Cell[] = useMemo(() => [
    { name: 'Gratitude', type: 'gratitude' as const, mono: '✿', art: stim.art('gratitude', 'Gratitude'), label: 'Gratitude' },
    { name: 'Win', type: 'win' as const, mono: '★', label: 'Win' },
    { name: 'Sleep', type: 'sleep' as const, mono: 'z', art: stim.art('sleep', 'Sleep'), label: 'Sleep' },
    ...restS.map(x => ({ id: x.id, name: x.name, type: 'recovery' as const, mono: monoOf(x.name), art: stim.art('recovery', x.name), label: labelOf(x), guest: guestIds.has(x.id) })),
    ...loadS.map(x => ({ id: x.id, name: x.name, type: 'training' as const, mono: monoOf(x.name), art: stim.art('training', x.name), label: labelOf(x), guest: guestIds.has(x.id) })),
  ], [loadS, restS, stim]);
  const [managing, setManaging] = useNavState('present.managing', false);
  const [moreOpen, setMoreOpen] = useNavState('present.more', false);

  const [screenRef] = useSize<HTMLDivElement>();
  const [ringRef, ring] = useSize<HTMLDivElement>();
  const drag = useRef<Drag | null>(null);
  const [draft, setDraft] = useNavState<Draft | null>('present.draft', null);
  const [held, setHeld] = useState<string | null>(null);
  const [detail, setDetail] = useNavState<string | null>('present.detail', null);
  const [listOpen, setListOpen] = useNavState('present.list', false);
  const [pick, setPick] = useState<{ x: number; y: number; ids: string[] } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4800); return () => clearTimeout(t); }, [toast]);

  const lastLevel = (c: Cell) => {
    for (const d of Object.keys(state.days).sort().reverse())
      for (const e of [...state.days[d].events].reverse())
        if (mine(e, c) && e.objectiveIntensity > 0) return Math.max(1, Math.min(10, Math.round(e.objectiveIntensity)));
    return 4;
  };
  const lastSleep = () => {
    for (const d of Object.keys(state.days).sort().reverse()) {
      const e = [...state.days[d].events].reverse().find(x => x.type === 'sleep');
      if (e) return { lvl: Math.max(1, Math.min(10, Math.round(e.objectiveIntensity))), pct: typeof e.custom_data?.amount === 'number' ? e.custom_data.amount : 80 };
    }
    return { lvl: 5, pct: 80 };
  };
  const lastPct = (c: Cell) => {
    for (const d of Object.keys(state.days).sort().reverse())
      for (const e of [...state.days[d].events].reverse()) { const p = mine(e, c) ? loadOf(e) : null; if (p) return p; }
    return 20;
  };

  // one drag model for both the node you pressed and the sheet itself: it continues from wherever the values were left
  // the knob follows the thumb 1:1 (so speed never changes), the level is the nearest bead, and each crossing ticks right here in the touch handler
  const begin = (x: number, d: Draft) => {
    const w = Math.min(520, document.documentElement.clientWidth);
    drag.current = { x, k0: beadX(d.lvl, w), lvl: d.lvl, w };
  };
  const move = (clientX: number) => {
    const g = drag.current; if (!g) return;
    const lo = beadX(1, g.w), hi = beadX(10, g.w), gap = (hi - lo) / 9;
    const kx = Math.max(lo, Math.min(hi, g.k0 + clientX - g.x));
    const pos = (kx - lo) / gap, near = Math.max(1, Math.min(10, Math.round(pos) + 1));
    let lvl = g.lvl;
    if (near !== g.lvl && Math.abs(pos - (g.lvl - 1)) > .56) lvl = near;   // small hysteresis so it never flutters on a boundary
    if (lvl !== g.lvl) { g.lvl = lvl; haptic(6); }
    setDraft(d => (d && d.cell.type !== 'win' ? { ...d, lvl, kx } : d));
  };
  const release = () => { drag.current = null; setDraft(d => (d && d.kx != null ? { ...d, kx: null } : d)); };
  const openFor = (c: Cell) => (e: React.PointerEvent<HTMLButtonElement>) => {
    if (draft) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const r = e.currentTarget.getBoundingClientRect(), sr = screenRef.current!.getBoundingClientRect();
    const from = { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 };
    const d = draftFor(c, from);
    haptic(10); setHeld(c.type + c.name); begin(e.clientX, d); setDraft(d);
  };
  const draftFor = (c: Cell, from?: { x: number; y: number }): Draft => {
    const sleepToday = c.type === 'sleep' ? events.find(x => x.type === 'sleep') : undefined, ls = c.type === 'sleep' ? lastSleep() : null;
    return sleepToday
      ? { cell: c, lvl: Math.max(1, Math.min(10, Math.round(sleepToday.objectiveIntensity))), pct: typeof sleepToday.custom_data?.amount === 'number' ? sleepToday.custom_data.amount : 80, note: sleepToday.notes ?? '', editId: sleepToday.id, from }
      : { cell: c, lvl: isText(c.type) ? 1 : ls ? ls.lvl : lastLevel(c), pct: isText(c.type) ? 0 : ls ? ls.pct : lastPct(c), note: '', from };
  };
  const pickMore = (x: { id: string; name: string; type: 'training' | 'recovery' }) => {
    setMoreOpen(false);
    setDraft(draftFor({ id: x.id, name: x.name, type: x.type, mono: monoOf(x.name), art: stim.art(x.type, x.name), label: labelOf(x), guest: true }));
  };
  const editEvent = (ev: Event) => {
    const c = cells.find(x => mine(ev, x)) ?? { name: ev.category, type: ev.type, mono: monoOf(ev.category), art: stim.art(ev.type, ev.category) };
    setDetail(null); setListOpen(false);
    setDraft({ cell: c, lvl: isText(ev.type) ? 1 : Math.max(1, Math.min(10, Math.round(ev.objectiveIntensity))), pct: ev.type === 'sleep' ? (typeof ev.custom_data?.amount === 'number' ? ev.custom_data.amount : 80) : loadOf(ev) ?? lastPct(c), note: ev.notes ?? '', editId: ev.id });
  };
  const commit = () => {
    const d = draft; if (!d) return;
    const isWin = isText(d.cell.type), isSleep = d.cell.type === 'sleep', reserve = isSleep ? sleepReserve(d.pct, d.lvl) : 0, notes = d.note.trim() || undefined;
    const cdata = isWin ? {} : isSleep ? { load: reserve, amount: d.pct } : { load: d.pct };
    const fields = { objectiveIntensity: isWin ? 1 : d.lvl, intensity: isWin ? 1 : subjectiveFor(d.lvl), notes };
    if (d.editId) {
      const old = events.find(e => e.id === d.editId);
      if (old) updateEvent(today, { ...old, ...fields, custom_data: { ...old.custom_data, ...cdata } });
      setToast({ text: 'Saved' });
    } else {
      const now = new Date(), min = now.getHours() * 60 + now.getMinutes(), time = hhmm(min);
      addEvent(today, { type: d.cell.type, category: d.cell.name, ...fields, duration: '<1h' as Duration, custom_data: { time, ...(d.cell.id ? { sid: d.cell.id } : {}), ...cdata }, date: today });
      if (d.from) { const b = { id: Date.now(), x: d.from.x, y: d.from.y, color: RIM[d.cell.type][0] }; setBursts(v => [...v, b]); setTimeout(() => setBursts(v => v.filter(x => x.id !== b.id)), 1700); }
      setToast({ text: `${d.cell.name}${isWin ? '' : isSleep ? ` · opens at ${reserve}%` : ` · ${d.pct}%`}`, undo: { cat: d.cell.name, type: d.cell.type, time } });
    }
    haptic(14); setDraft(null);
  };
  const undo = () => {
    const u = toast?.undo; if (!u) return;
    const ev = [...events].reverse().find(e => e.category === u.cat && e.type === u.type && e.custom_data?.time === u.time);
    if (ev) deleteEvent(today, ev.id);
    setToast({ text: 'Removed' });
  };
  const detailEv = detail ? events.find(e => e.id === detail) : undefined;

  // ring geometry: see layout.ts. Positions depend only on how many circles each half has, so they stay put as you add or hide others.
  const L = useMemo(() => layout(ring.w, ring.h, loadS.length, restS.length), [ring.w, ring.h, loadS.length, restS.length]);
  const { cx, cy, rx, ry, sz, crest } = L;
  const cellPts = useMemo(() => [L.gratitude, L.win, L.sleep, ...L.rest, ...L.load], [L]);

  const mine = (e: Event, c: Cell) => (c.id && e.custom_data?.sid ? e.custom_data.sid === c.id : e.type === c.type && e.category === c.name);
  const counts = (c: Cell) => events.filter(e => mine(e, c)).length;
  const loadN = sideTotal(events, 'training'), restN = sideTotal(events, 'recovery'), winN = events.filter(e => e.type === 'win').length;

  // every wisp's geometry, shared by drawing and by tap-picking (a tap where several overlap lists them all)
  const csz = (k: number) => (cellPts[k]?.inner ? Math.round(sz * .92) : sz);
  const spokes = cells.flatMap((c, k) => {
    if (!isStim(c.type)) return [];
    const ev = events.filter(e => mine(e, c)); if (!ev.length) return [];
    const { x, y } = cellPts[k] ?? { x: 0, y: 0 }, cs = csz(k), d = Math.hypot(cx - x, cy - y) || 1, base = Math.atan2(cy - y, cx - x);
    const room = Math.max(16, d - cs / 2 - crest / 2 * .6 - 4), rim = RIM[c.type][0], side = c.type === 'recovery' ? 'recovery' : 'training';
    return ev.map((e, j) => {
      const th = base + (j - (ev.length - 1) / 2) * Math.min(.34, 1.1 / ev.length);   // several events on one circle fan out
      // length = load (share of the day), width swells with it, colour = intensity; instances logged before load existed get a short neutral wisp
      const p = loadOf(e), frac = p == null ? .2 : Math.max(.12, Math.min(1, p / 100)), len = cs / 2 + 4 + frac * room, W = p == null ? 4 : 6 + 9 * frac;
      const col = p == null ? 'rgb(150,156,172)' : heat(side, e.objectiveIntensity || 1);
      const dx = Math.cos(th), dy = Math.sin(th), h = [...e.id].reduce((a, ch) => a + ch.charCodeAt(0), 0);
      const w = wisp(x, y, dx, dy, len, W, 1 + (h % 5) * .08);
      return { id: e.id, e, c, p, rim, col, x, y, dx, dy, px: -dy, py: dx, w: W, tx: x + dx * len, ty: y + dy * len, d: w.d, vein: w.vein, delay: -(h % 70) / 10 };
    });
  });
  type Spoke = (typeof spokes)[number];
  const openSpoke = (ev: React.MouseEvent<SVGGElement>, sp: Spoke) => {
    const r = ev.currentTarget.ownerSVGElement!.getBoundingClientRect(), px = ev.clientX - r.left, py = ev.clientY - r.top;
    const near = (q: Spoke) => {
      const vx = q.tx - q.x, vy = q.ty - q.y, t = Math.max(0, Math.min(1, ((px - q.x) * vx + (py - q.y) * vy) / (vx * vx + vy * vy || 1)));
      return Math.hypot(px - (q.x + vx * t), py - (q.y + vy * t)) <= Math.max(11, q.w + 5);
    };
    const ids = spokes.filter(q => q.id === sp.id || near(q)).sort((a, b) => (evOrder(a.e) ?? 1e4) - (evOrder(b.e) ?? 1e4)).map(q => q.id);
    haptic(8);
    if (ids.length > 1) setPick({ x: px, y: py, ids }); else setDetail(sp.id);
  };

  return (
    <div className="screen" ref={screenRef} style={{ padding: '0 0 10px' }}>
      {!isToday && (
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, margin: '0 16px 10px', padding: '6px 6px 6px 14px', borderRadius: 22, background: INK, color: '#fff' }}>
          <span className="it" style={{ fontSize: 14 }}>{fromDstr(day).toLocaleDateString('en', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          <button className="chip press" onClick={onExitDay} style={{ height: 32, background: '#fff', color: INK, fontSize: 13 }}>Back to today</button>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 24px', height: 22, flex: 'none' }}>
        <button className="it press" onClick={() => setListOpen(true)} aria-label="List today's instances" style={{ fontSize: 15, textAlign: 'left' }}>
          <b className="serif" style={{ fontStyle: 'normal', fontWeight: 600, color: EMBER }}>{loadN}%</b> load · <b className="serif" style={{ fontStyle: 'normal', fontWeight: 600, color: SKY }}>{restN}%</b> rest · <b className="serif" style={{ fontStyle: 'normal', fontWeight: 600, color: GOLD }}>{winN}</b> <span style={{ display: 'inline-block', verticalAlign: '-4px' }}><Sym n="sparkle" on={winN > 0} s={16} o={winN > 0 ? 1 : .6} /></span> win{winN === 1 ? '' : 's'} <span style={{ color: INK2 }}>›</span>
        </button>
        {day === today ? <BalanceChip onOpen={onBalance} fallback={<span style={{ fontSize: 11, color: INK2 }}>nothing logged yet</span>} /> : <span style={{ fontSize: 11, color: INK2 }}>{last ? `last · ${last.category} · ${fmtMin(evMin(last)!, true)}` : 'nothing logged yet'}</span>}
      </div>

      <div ref={ringRef} className="grow" style={{ position: 'relative' }}>
        <div className="wash" style={{ left: cx - 120, top: cy - 120, width: 240, height: 240, background: 'rgba(200,161,90,.14)' }} />
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={INK} strokeWidth=".7" opacity=".18" />
          {L.inner && <ellipse cx={cx} cy={cy} rx={L.inner.rx} ry={L.inner.ry} fill="none" stroke={INK} strokeWidth=".7" opacity=".12" />}
          <ellipse cx={cx} cy={cy} rx={rx + 34} ry={ry + 30} fill="none" stroke={GOLD} strokeWidth=".8" opacity=".35" strokeDasharray="1 5" />
        </svg>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} aria-hidden="true">
          <defs><filter id="wglow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.2" /></filter></defs>
          {spokes.map(sp => (
            <g key={sp.id} onClick={ev => openSpoke(ev, sp)} style={{ pointerEvents: 'auto', cursor: 'pointer' }} role="button" aria-label={`${sp.c.name} ${sp.p ?? '?'} percent, intensity ${Math.round(sp.e.objectiveIntensity)}, open`}>
              <linearGradient id={`wg-${sp.id}`} gradientUnits="userSpaceOnUse" x1={sp.x} y1={sp.y} x2={sp.tx} y2={sp.ty}>
                <stop offset="0" stopColor={sp.col} stopOpacity="1" /><stop offset=".55" stopColor={sp.col} stopOpacity=".82" /><stop offset="1" stopColor={sp.col} stopOpacity=".12" />
              </linearGradient>
              <g className="wsway" style={{ transformOrigin: `${sp.x}px ${sp.y}px`, animationDelay: `${sp.delay}s` }}>
                <g className="win" style={{ transformOrigin: `${sp.x}px ${sp.y}px` }}>
                  <path d={sp.d} fill={sp.col} opacity=".45" filter="url(#wglow)" />
                  <path d={sp.d} fill={`url(#wg-${sp.id})`} stroke={sp.rim} strokeWidth=".6" strokeOpacity=".5" strokeLinejoin="round" />
                  <path d={sp.vein} fill="none" stroke="#fff" strokeWidth="1.1" strokeOpacity=".5" strokeLinecap="round" />
                </g>
              </g>
              <line x1={sp.x + sp.dx * (sz / 2)} y1={sp.y + sp.dy * (sz / 2)} x2={sp.tx} y2={sp.ty} stroke="transparent" strokeWidth={Math.max(22, sp.w * 2)} strokeLinecap="round" />
            </g>
          ))}
        </svg>
        {cells.map((c, k) => {
          const { x, y, a } = cellPts[k] ?? { x: 0, y: 0, a: 0 };
          const [r, f] = RIM[c.type], n = counts(c), id = c.type + c.name;
          const cs = csz(k), co = Math.cos(a), si = Math.sin(a), off = cs / 2 + 6;
          const lab: React.CSSProperties = co > .35 ? { left: x + off, top: y, transform: 'translateY(-50%)' }
            : co < -.35 ? { left: x - off, top: y, transform: 'translate(-100%,-50%)' }
            : { left: x, top: y + (si > 0 ? off + 3 : -off - 3), transform: `translate(${x < cx - 2 ? '-82%' : x > cx + 2 ? '-18%' : '-50%'},-50%)` };   // top and bottom neighbours lean apart so their names never touch
          const tag: React.CSSProperties = { left: x, top: y + cs / 2 - 2, transform: 'translate(-50%,0)' };   // inner-ring circles wear their name as a small tag instead
          return (
            <span key={id}>
              <button className={`node ${held === id ? 'held' : ''}`} aria-label={`Log ${c.name}`}
                style={{ left: x, top: y, ['--r' as string]: r, ['--f' as string]: f, ['--sz' as string]: `${cs}px` }}
                onPointerDown={openFor(c)} onPointerMove={e => move(e.clientX)} onPointerUp={() => { release(); setHeld(null); }} onPointerCancel={() => { release(); setHeld(null); }} onContextMenu={e => e.preventDefault()}>
                <i />{c.type === 'win' || c.art
                  ? <img className="catart" src={c.type === 'win' ? WIN_ICON : c.art} alt="" draggable={false} style={{ marginTop: !isStim(c.type) && n ? -5 : 0, width: cs * .8, height: cs * .8 }} />
                  : <b style={{ fontSize: c.mono.length > 1 ? 12.5 : 16, marginTop: n ? -4 : 0 }}>{c.mono}</b>}
                {!isStim(c.type) && n > 0 && <span className="pips">{Array.from({ length: Math.min(n, 4) }, (_, i) => <s key={i} />)}</span>}
              </button>
              <span className={`nl${cellPts[k]?.inner ? ' tag' : ''}`} style={cellPts[k]?.inner ? tag : lab}>{c.label}</span>
            </span>
          );
        })}
        {pick && (() => {
          const rows = pick.ids.map(id => events.find(e => e.id === id)).filter((e): e is Event => !!e);
          const W = 232, h = 14 + rows.length * 52, left = Math.max(8, Math.min(ring.w - W - 8, pick.x - W / 2));
          const top = Math.max(4, pick.y + 16 + h > ring.h ? pick.y - 16 - h : pick.y + 16);
          return (
            <>
              <div style={{ position: 'absolute', inset: 0, zIndex: 20 }} onClick={() => setPick(null)} />
              <div role="dialog" aria-label="Which one?" style={{ position: 'absolute', left, top, width: W, maxHeight: Math.max(120, ring.h - 8), overflowY: 'auto', zIndex: 21, borderRadius: 20, padding: '6px 6px 8px', background: 'rgba(255,255,255,.98)', boxShadow: '0 0 0 1px rgba(43,50,71,.08), 0 18px 44px rgba(43,50,71,.28)', animation: 'rise .22s var(--ease)' }}>
                <div className="caps" style={{ padding: '6px 10px 2px' }}>Which one?</div>
                {rows.map(e => (
                  <button key={e.id} className="irow press" style={{ padding: '7px 8px' }} onClick={() => { setPick(null); setDetail(e.id); }}>
                    <Art e={e} s={34} />
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span className="serif" style={{ fontSize: 16, display: 'block', lineHeight: 1.15 }}>{e.category}</span>
                      <span style={{ fontSize: 11.5, color: INK2 }}>{evMin(e) != null ? fmtMin(evMin(e)!, true) : 'no time'} · {loadOf(e) != null ? `${loadOf(e)}%` : '—'}</span>
                    </span>
                    <span style={{ color: INK2, fontSize: 15 }}>›</span>
                  </button>
                ))}
              </div>
            </>
          );
        })()}
        <button className="crest" onClick={onPulse} style={{ ['--cf' as string]: crest < 106 ? .82 : 1, left: cx - crest / 2, top: cy - crest / 2, width: crest, height: crest }}>
          <TabMark m="present" o={answered >= nq ? 1 : .32} />
          <span className="it" style={{ fontSize: 'calc(15px * var(--cf, 1))', lineHeight: 1.15, textAlign: 'center' }}>{answered >= nq ? 'Pulse done' : 'Evening pulse'}</span>
          <span style={{ display: 'flex', gap: 3, marginTop: 3 }}>{Array.from({ length: nq }, (_, k) => <i key={k} style={{ width: 'calc(5px * var(--cf, 1))', height: 'calc(5px * var(--cf, 1))', borderRadius: 3, background: k < answered ? GOLD : 'rgba(43,50,71,.15)' }} />)}</span>
          <span className="caps" style={{ fontSize: 'calc(8.5px * var(--cf, 1))', marginTop: 3 }}>{answered} of {nq}</span>
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', height: 40, flex: 'none' }}>
        <button className="chip press" onClick={() => setManaging(true)} style={{ height: 36, gap: 8, background: '#fff', boxShadow: '0 0 0 1px rgba(43,50,71,.14),0 6px 16px rgba(43,50,71,.08)' }}>
          <span className="it" style={{ fontSize: 14 }}>Circles</span>
        </button>
        {moreS.length > 0 && <button className="chip press" onClick={() => setMoreOpen(true)} aria-label="More circles" style={{ height: 36, gap: 6, background: '#fff', boxShadow: '0 0 0 1px rgba(43,50,71,.14),0 6px 16px rgba(43,50,71,.08)' }}>
          <span className="it" style={{ fontSize: 14 }}>More</span><span className="caps" style={{ fontSize: 10 }}>{moreS.length}</span>
        </button>}
        <button className="chip press" onClick={onDump} style={{ height: 36, gap: 8, background: '#fff', boxShadow: '0 0 0 1px rgba(43,50,71,.14),0 6px 16px rgba(43,50,71,.08)' }}>
          <Sym n="wisp" on={told} s={20} />
          <span className="it" style={{ fontSize: 14 }}>{told ? 'The day, told' : 'Dump the day'}</span>
        </button>
      </div>

      {draft && (
        <LogSheet d={draft} anchors={state.config.scales[draft.cell.type === 'sleep' ? 'sleep' : draft.cell.type === 'recovery' ? 'recovery' : 'training'].objective}
          onDown={e => { begin(e.clientX, draft); e.currentTarget.setPointerCapture(e.pointerId); }}
          onMove={e => move(e.clientX)} onUp={release}
          onNote={t => setDraft(v => (v ? { ...v, note: t } : v))} onConfirm={commit}
          onPct={p => setDraft(v => (v ? { ...v, pct: p } : v))} onPin={draft.cell.guest && draft.cell.id ? () => { stim.setShown([draft.cell.id!], true); haptic(8); } : undefined} before={draft.cell.type === 'training' || draft.cell.type === 'recovery' ? sideTotal(events, draft.cell.type, draft.editId) : 0} onClose={() => setDraft(null)} />
      )}
      {moreOpen && <More circles={moreS} onPick={pickMore} onClose={() => setMoreOpen(false)} />}
      {managing && <Circles onClose={() => setManaging(false)} />}
      {listOpen && <TodayList events={events} title={isToday ? 'Today' : fromDstr(day).toLocaleDateString('en', { weekday: 'long' })} onOpen={id => { setListOpen(false); setDetail(id); }} onClose={() => setListOpen(false)} />}
      {detailEv && (
        <EventCard e={detailEv}
          anchorLabel={isText(detailEv.type) ? undefined : state.config.scales[detailEv.type === 'sleep' ? 'sleep' : detailEv.type === 'recovery' ? 'recovery' : 'training'].objective.find(x => x.value === Math.round(detailEv.objectiveIntensity))?.label}
          onEdit={() => editEvent(detailEv)} onDelete={() => { deleteEvent(today, detailEv.id); setDetail(null); setToast({ text: 'Removed' }); }} onClose={() => setDetail(null)} />
      )}

      {bursts.map(b => (
        <div key={b.id} className="burst" style={{ left: b.x, top: b.y }}>
          {Array.from({ length: 6 }, (_, i) => {
            const dx = (i % 2 ? 1 : -1) * (14 + i * 9), dy = -(50 + i * 22);
            return (
              <i key={i} style={{ ['--dx' as string]: `${dx}px`, ['--dy' as string]: `${dy}px`, ['--r' as string]: `${(i - 3) * 14}deg`, animationDelay: `${i * 60}ms` }}>
                <svg width="20" height="18" viewBox="-16 -13 32 26" aria-hidden="true"><Fly x={0} y={0} s={1 - i * .1} c={b.color} o={.9} /></svg>
              </i>
            );
          })}
        </div>
      ))}

      {toast && !draft && !detailEv && !listOpen && (
        <div className="toast" key={toast.text} role="status">
          <svg width="16" height="16" viewBox="-16 -13 32 26" aria-hidden="true"><Fly x={0} y={0} c={EMBER} /></svg>
          <span>{toast.undo ? <>Logged <span className="it">{toast.text}</span></> : toast.text}</span>
          {toast.undo && <button className="u press" onClick={undo}>Undo</button>}
        </div>
      )}
    </div>
  );
};
