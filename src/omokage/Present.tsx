import { Drg, Sym } from './Sym';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import type { Duration, Event } from '../types';
import { Fly } from './Art';
import { Circles } from './Circles';
import { layout } from './layout';
import { labelOf, monoOf, useStimuli } from './stimuli';
import { WIN_ICON } from './icons';
import { haptic } from './haptics';
import { EventCard, TodayList, evStart } from './Instances';
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
export const Present = ({ day, onExitDay, onDump, onPulse }: { day: string; onExitDay: () => void; onDump: () => void; onPulse: () => void }) => {
  const { state, addEvent, updateEvent, deleteEvent } = useApp();
  const today = day, isToday = day === todayStr();
  const told = !!state.days[day]?.note?.trim();
  const events = state.days[today]?.events ?? [];
  const timed = events.filter(e => evMin(e) !== null).sort((a, b) => evMin(a)! - evMin(b)!);
  const last = timed.length ? timed[timed.length - 1] : null;
  const answered = Object.keys(state.days[today]?.answers ?? {}).length, nq = state.config.daily_questions.length;

  const stim = useStimuli();
  const loadS = stim.ring('training'), restS = stim.ring('recovery');
  const cells: Cell[] = useMemo(() => [
    { name: 'Win', type: 'win' as const, mono: '★' },
    ...restS.map(x => ({ id: x.id, name: x.name, type: 'recovery' as const, mono: monoOf(x.name), art: stim.art('recovery', x.name), label: labelOf(x) })),
    ...loadS.map(x => ({ id: x.id, name: x.name, type: 'training' as const, mono: monoOf(x.name), art: stim.art('training', x.name), label: labelOf(x) })),
  ], [loadS, restS, stim]);
  const [managing, setManaging] = useState(false);

  const [screenRef] = useSize<HTMLDivElement>();
  const [ringRef, ring] = useSize<HTMLDivElement>();
  const drag = useRef<Drag | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [held, setHeld] = useState<string | null>(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [toast, setToast] = useState<Toast | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4800); return () => clearTimeout(t); }, [toast]);

  const lastLevel = (c: Cell) => {
    for (const d of Object.keys(state.days).sort().reverse())
      for (const e of [...state.days[d].events].reverse())
        if (mine(e, c) && e.objectiveIntensity > 0) return Math.max(1, Math.min(10, Math.round(e.objectiveIntensity)));
    return 3;
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
    const d: Draft = { cell: c, lvl: c.type === 'win' ? 1 : lastLevel(c), pct: c.type === 'win' ? 0 : lastPct(c), note: '', from: { x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2 } };
    haptic(10); setHeld(c.type + c.name); begin(e.clientX, d); setDraft(d);
  };
  const editEvent = (ev: Event) => {
    const c = cells.find(x => mine(ev, x)) ?? { name: ev.category, type: ev.type, mono: monoOf(ev.category), art: stim.art(ev.type, ev.category) };
    setDetail(null); setListOpen(false);
    setDraft({ cell: c, lvl: ev.type === 'win' ? 1 : Math.max(1, Math.min(10, Math.round(ev.objectiveIntensity))), pct: loadOf(ev) ?? lastPct(c), note: ev.notes ?? '', editId: ev.id });
  };
  const commit = () => {
    const d = draft; if (!d) return;
    const isWin = d.cell.type === 'win', notes = d.note.trim() || undefined;
    const fields = { objectiveIntensity: isWin ? 1 : d.lvl, intensity: isWin ? 1 : Math.max(1, Math.min(4, Math.ceil(d.lvl / 2.5))), notes };
    if (d.editId) {
      const old = events.find(e => e.id === d.editId);
      if (old) updateEvent(today, { ...old, ...fields, custom_data: { ...old.custom_data, ...(isWin ? {} : { load: d.pct }) } });
      setToast({ text: 'Saved' });
    } else {
      const now = new Date(), min = now.getHours() * 60 + now.getMinutes(), time = hhmm(min);
      addEvent(today, { type: d.cell.type, category: d.cell.name, ...fields, duration: '<1h' as Duration, custom_data: { time, ...(d.cell.id ? { sid: d.cell.id } : {}), ...(isWin ? {} : { load: d.pct }) }, date: today });
      if (d.from) { const b = { id: Date.now(), x: d.from.x, y: d.from.y, color: RIM[d.cell.type][0] }; setBursts(v => [...v, b]); setTimeout(() => setBursts(v => v.filter(x => x.id !== b.id)), 1700); }
      setToast({ text: `${d.cell.name}${isWin ? '' : ` · ${d.pct}%`}`, undo: { cat: d.cell.name, type: d.cell.type, time } });
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
  const cellPts = useMemo(() => [L.win, ...L.rest, ...L.load], [L]);

  const mine = (e: Event, c: Cell) => (c.id && e.custom_data?.sid ? e.custom_data.sid === c.id : e.type === c.type && e.category === c.name);
  const counts = (c: Cell) => events.filter(e => mine(e, c)).length;
  const loadN = sideTotal(events, 'training'), restN = sideTotal(events, 'recovery'), winN = events.filter(e => e.type === 'win').length;

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
        <span style={{ fontSize: 11, color: INK2 }}>{last ? `last · ${last.category} · ${fmtMin(evMin(last)!, true)}` : 'nothing logged yet'}</span>
      </div>

      <div ref={ringRef} className="grow" style={{ position: 'relative' }}>
        <div className="wash" style={{ left: cx - 120, top: cy - 120, width: 240, height: 240, background: 'rgba(200,161,90,.14)' }} />
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={INK} strokeWidth=".7" opacity=".18" />
          {L.inner && <ellipse cx={cx} cy={cy} rx={L.inner.rx} ry={L.inner.ry} fill="none" stroke={INK} strokeWidth=".7" opacity=".12" />}
          <ellipse cx={cx} cy={cy} rx={rx + 34} ry={ry + 30} fill="none" stroke={GOLD} strokeWidth=".8" opacity=".35" strokeDasharray="1 5" />
        </svg>
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} aria-hidden="true">
          {cells.map((c, k) => {
            if (c.type === 'win') return null;
            const ev = events.filter(e => mine(e, c)); if (!ev.length) return null;
            const { x, y } = cellPts[k] ?? { x: 0, y: 0 }, d = Math.hypot(cx - x, cy - y) || 1, base = Math.atan2(cy - y, cx - x);
            const room = Math.max(10, d - crest / 2 - sz / 2 - 8), rim = RIM[c.type][0], side = c.type === 'recovery' ? 'recovery' : 'training';
            return ev.map((e, j) => {
              const th = base + (j - (ev.length - 1) / 2) * Math.min(.2, .9 / ev.length);   // several events on one circle fan out
              // length = load (share of the day), colour = intensity; instances logged before load existed get a short neutral spoke
              const p = loadOf(e), L = sz / 2 + 4 + (p == null ? .16 : Math.max(.06, Math.min(1, p / 100))) * room;
              const fill = p == null ? 'rgba(43,50,71,.18)' : heat(side, e.objectiveIntensity || 1);
              const dx = Math.cos(th), dy = Math.sin(th), px = -dy, py = dx, w = 3 + L * .035;
              const tx = x + dx * L, ty = y + dy * L, mx = x + dx * L * .5, my = y + dy * L * .5;
              return (
                <g key={e.id} onClick={() => { haptic(8); setDetail(e.id); }} style={{ pointerEvents: 'auto', cursor: 'pointer' }} role="button" aria-label={`${c.name} ${p ?? '?'} percent, intensity ${Math.round(e.objectiveIntensity)}, open`}>
                  <path d={`M${x} ${y} Q ${mx + px * w} ${my + py * w} ${tx} ${ty} Q ${mx - px * w} ${my - py * w} ${x} ${y} Z`} fill={fill} stroke={rim} strokeWidth=".6" opacity=".85" />
                  <line x1={x + dx * (sz / 2)} y1={y + dy * (sz / 2)} x2={tx} y2={ty} stroke="transparent" strokeWidth="20" strokeLinecap="round" />
                </g>
              );
            });
          })}
        </svg>
        {cells.map((c, k) => {
          const { x, y, a } = cellPts[k] ?? { x: 0, y: 0, a: 0 };
          const [r, f] = RIM[c.type], n = counts(c), id = c.type + c.name;
          const co = Math.cos(a), si = Math.sin(a), off = sz / 2 + 6;
          const lab: React.CSSProperties = co > .35 ? { left: x + off, top: y, transform: 'translateY(-50%)' }
            : co < -.35 ? { left: x - off, top: y, transform: 'translate(-100%,-50%)' }
            : { left: x, top: y + (si > 0 ? off + 3 : -off - 3), transform: 'translate(-50%,-50%)' };
          return (
            <span key={id}>
              <button className={`node ${held === id ? 'held' : ''}`} aria-label={`Log ${c.name}`}
                style={{ left: x, top: y, ['--r' as string]: r, ['--f' as string]: f, ['--sz' as string]: `${sz}px` }}
                onPointerDown={openFor(c)} onPointerMove={e => move(e.clientX)} onPointerUp={() => { release(); setHeld(null); }} onPointerCancel={() => { release(); setHeld(null); }} onContextMenu={e => e.preventDefault()}>
                <i />{c.type === 'win' || c.art
                  ? <img className="catart" src={c.type === 'win' ? WIN_ICON : c.art} alt="" draggable={false} style={{ marginTop: c.type === 'win' && n ? -5 : 0, width: sz * .8, height: sz * .8 }} />
                  : <b style={{ fontSize: c.mono.length > 1 ? 12.5 : 16, marginTop: n ? -4 : 0 }}>{c.mono}</b>}
                {c.type === 'win' && n > 0 && <span className="pips">{Array.from({ length: Math.min(n, 4) }, (_, i) => <s key={i} />)}</span>}
              </button>
              {(L.labels || held === id) && <span className="nl" style={lab}>{c.type === 'win' ? 'Win' : c.label}</span>}
            </span>
          );
        })}
        <button className="crest" onClick={onPulse} style={{ left: cx - crest / 2, top: cy - crest / 2, width: crest, height: crest }}>
          <Drg n="riderg" w={42} o={answered >= nq ? 1 : .32} />
          <span className="it" style={{ fontSize: 15 }}>{answered >= nq ? 'Pulse done' : 'Evening pulse'}</span>
          <span style={{ display: 'flex', gap: 3, marginTop: 3 }}>{Array.from({ length: nq }, (_, k) => <i key={k} style={{ width: 5, height: 5, borderRadius: 3, background: k < answered ? GOLD : 'rgba(43,50,71,.15)' }} />)}</span>
          <span className="caps" style={{ fontSize: 8.5, marginTop: 3 }}>{answered} of {nq}</span>
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', height: 40, flex: 'none' }}>
        <button className="chip press" onClick={() => setManaging(true)} style={{ height: 36, gap: 8, background: '#fff', boxShadow: '0 0 0 1px rgba(43,50,71,.14),0 6px 16px rgba(43,50,71,.08)' }}>
          <span className="it" style={{ fontSize: 14 }}>Circles</span>
        </button>
        <button className="chip press" onClick={onDump} style={{ height: 36, gap: 8, background: '#fff', boxShadow: '0 0 0 1px rgba(43,50,71,.14),0 6px 16px rgba(43,50,71,.08)' }}>
          <Sym n="wisp" on={told} s={20} />
          <span className="it" style={{ fontSize: 14 }}>{told ? 'The day, told' : 'Dump the day'}</span>
        </button>
      </div>

      {draft && (
        <LogSheet d={draft} anchors={state.config.scales[draft.cell.type === 'recovery' ? 'recovery' : 'training'].objective}
          onDown={e => { begin(e.clientX, draft); e.currentTarget.setPointerCapture(e.pointerId); }}
          onMove={e => move(e.clientX)} onUp={release}
          onNote={t => setDraft(v => (v ? { ...v, note: t } : v))} onConfirm={commit}
          onPct={p => setDraft(v => (v ? { ...v, pct: p } : v))} before={draft.cell.type === 'win' ? 0 : sideTotal(events, draft.cell.type, draft.editId)} onClose={() => setDraft(null)} />
      )}
      {managing && <Circles onClose={() => setManaging(false)} />}
      {listOpen && <TodayList events={events} title={isToday ? 'Today' : fromDstr(day).toLocaleDateString('en', { weekday: 'long' })} onOpen={id => { setListOpen(false); setDetail(id); }} onClose={() => setListOpen(false)} />}
      {detailEv && (
        <EventCard e={detailEv}
          anchorLabel={detailEv.type === 'win' ? undefined : state.config.scales[detailEv.type === 'recovery' ? 'recovery' : 'training'].objective.find(x => x.value === Math.round(detailEv.objectiveIntensity))?.label}
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
