import { useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import type { Event, EventType } from '../types';
import { Butterfly } from './Art';
import { haptic } from './haptics';
import { LOAD, REST, BRASS, fmtMin, hhmm, nowHalfHour, parseHM, shortDate, todayStr } from './skins';

const STEP_Y = 34;            // px of vertical travel per 30 minutes
const MAX_STEP_X = 32;        // px per intensity level (shrinks near screen edges so 1–10 is always reachable)
const HOLD_MS = 170;

interface Cell { name: string; type: EventType; mono: string }
interface Scrub { cell: Cell; startMin: number; startLvl: number; raw: number; lvl: number }
interface Press { raw: number; lvl: number; cell: Cell; x: number; y: number; active: boolean; timer: number; startMin: number; startLvl: number; stepL: number; stepR: number; el: HTMLElement; lastKey: string }
interface Toast { text: string; undo?: { cat: string; type: EventType; time: string } }
interface Burst { id: number; x: number; y: number; color: string }

const monos = (names: string[]) => names.map(n => {
  const one = n[0].toUpperCase();
  const clash = names.filter(o => o[0].toUpperCase() === one).length > 1;
  return clash ? one + (n[1] ?? '').toLowerCase() : one;
});
const rimClass = (t: EventType) => (t === 'training' ? 'rim-load' : t === 'recovery' ? 'rim-rest' : 'rim-win');
const evMin = (e: Event) => parseHM(e.custom_data?.time);

export const Present = ({ onDump }: { onDump: () => void }) => {
  const { state, addEvent, deleteEvent } = useApp();
  const today = todayStr();
  const events = state.days[today]?.events ?? [];
  const timed = events.filter(e => evMin(e) !== null).sort((a, b) => evMin(a)! - evMin(b)!);
  const last = timed.length ? timed[timed.length - 1] : null;

  const load = state.config.categories.training, rest = state.config.categories.recovery;
  const lm = monos(load), rm = monos(rest);
  const loadCells: Cell[] = load.map((n, i) => ({ name: n, type: 'training', mono: lm[i] }));
  const restCells: Cell[] = rest.map((n, i) => ({ name: n, type: 'recovery', mono: rm[i] }));
  const win: Cell = { name: 'Win', type: 'win', mono: '★' };

  const screen = useRef<HTMLDivElement>(null);
  const press = useRef<Press | null>(null);
  const [scrub, setScrub] = useState<Scrub | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [held, setHeld] = useState<string | null>(null);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 4800); return () => clearTimeout(t); }, [toast]);

  const lastLevel = (c: Cell) => {
    for (const d of Object.keys(state.days).sort().reverse())
      for (const e of [...state.days[d].events].reverse())
        if (e.type === c.type && e.category === c.name && e.objectiveIntensity > 0) return Math.max(1, Math.min(10, Math.round(e.objectiveIntensity)));
    return 3;
  };

  const activate = () => {
    const p = press.current; if (!p || p.active) return;
    p.active = true; haptic(10);
    setHeld(p.cell.type + p.cell.name);
    setScrub({ cell: p.cell, startMin: p.startMin, startLvl: p.startLvl, raw: 0, lvl: p.startLvl });
  };

  const onDown = (c: Cell) => (e: React.PointerEvent<HTMLButtonElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    const startLvl = c.type === 'win' ? 1 : lastLevel(c);
    const vw = document.documentElement.clientWidth;
    const availL = e.clientX - 12, availR = vw - 12 - e.clientX;
    press.current = {
      cell: c, x: e.clientX, y: e.clientY, active: false, el: e.currentTarget,
      startMin: last ? evMin(last)! : nowHalfHour(), startLvl,
      stepL: startLvl > 1 ? Math.min(MAX_STEP_X, availL / (startLvl - 1)) : MAX_STEP_X,
      stepR: startLvl < 10 ? Math.min(MAX_STEP_X, availR / (10 - startLvl)) : MAX_STEP_X,
      timer: window.setTimeout(activate, HOLD_MS), lastKey: '', raw: 0, lvl: startLvl,
    };
  };
  const onMove = (e: React.PointerEvent) => {
    const p = press.current; if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (!p.active) { if (Math.hypot(dx, dy) > 10) { clearTimeout(p.timer); activate(); } else return; }
    const raw = Math.max(-40, Math.min(40, -dy / STEP_Y));     // up = later (drag the tape like an iOS picker)
    const lvl = p.cell.type === 'win' ? 1 : Math.max(1, Math.min(10, p.startLvl + (dx < 0 ? -Math.round(-dx / p.stepL) : Math.round(dx / p.stepR))));
    const key = `${Math.round(raw)}|${lvl}`;
    if (key !== p.lastKey) { if (p.lastKey) haptic(4); p.lastKey = key; }
    p.raw = raw; p.lvl = lvl;
    setScrub(s => s && { ...s, raw, lvl });
  };
  const finish = (cancel: boolean) => () => {
    const p = press.current; press.current = null; setHeld(null);
    if (!p) return;
    clearTimeout(p.timer);
    setScrub(null);
    if (cancel) return;
    if (!p.active) { setToast({ text: 'Hold a medallion, then slide' }); return; }
    const s = { cell: p.cell, startMin: p.startMin, raw: p.raw, lvl: p.lvl };
    const min = s.startMin + Math.round(s.raw) * 30;
    const time = hhmm(min);
    const isWin = s.cell.type === 'win';
    addEvent(today, {
      type: s.cell.type, category: s.cell.name, objectiveIntensity: isWin ? 1 : s.lvl,
      intensity: isWin ? 1 : Math.max(1, Math.min(4, Math.ceil(s.lvl / 2.5))),
      duration: '<1h', custom_data: { time }, date: today,
    });
    haptic(14);
    const r = p.el.getBoundingClientRect(), sr = screen.current!.getBoundingClientRect();
    const b = { id: Date.now(), x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2, color: isWin ? BRASS : s.cell.type === 'training' ? LOAD : REST };
    setBursts(v => [...v, b]); setTimeout(() => setBursts(v => v.filter(x => x.id !== b.id)), 1300);
    setToast({ text: `${s.cell.name}${isWin ? '' : ` · ${s.lvl}`} · ${fmtMin(min)}`, undo: { cat: s.cell.name, type: s.cell.type, time } });
  };
  const undo = () => {
    const u = toast?.undo; if (!u) return;
    const ev = [...(state.days[today]?.events ?? [])].reverse().find(e => e.category === u.cat && e.type === u.type && e.custom_data?.time === u.time);
    if (ev) deleteEvent(today, ev.id);
    setToast({ text: 'Removed' });
  };

  const count = (c: Cell) => events.filter(e => e.type === c.type && e.category === c.name).length;
  const med = (c: Cell) => {
    const n = count(c), k = c.type + c.name;
    return (
      <div className="med" key={k}>
        <button className={`med-btn ${rimClass(c.type)} ${held === k ? 'held' : ''}`} aria-label={`Log ${c.name}`}
          onPointerDown={onDown(c)} onPointerMove={onMove} onPointerUp={finish(false)} onPointerCancel={finish(true)} onContextMenu={e => e.preventDefault()}>
          <span className="mono" style={c.mono.length > 1 ? { fontSize: 16 } : undefined}>{c.mono}</span>
          {n > 0 && <span className="pip" key={n}>{n}</span>}
        </button>
        <span className="lbl">{c.name}</span>
      </div>
    );
  };

  const loadN = events.filter(e => e.type === 'training'), restN = events.filter(e => e.type === 'recovery'), winN = events.filter(e => e.type === 'win');
  const sum = (a: Event[]) => a.reduce((t, e) => t + (e.objectiveIntensity || 0), 0);
  const cap = Math.max(18, sum(loadN), sum(restN));

  return (
    <div className="screen" ref={screen}>
      <div className="codex" style={{ paddingBottom: 9 }}>
        <span className="corner" style={{ left: -4, top: -4 }} /><span className="corner" style={{ right: -4, top: -4 }} />
        <div className="sheet-row">
          <span className="caps">Today · {shortDate()}</span>
          <span style={{ fontSize: 11.5, color: '#6E6250' }}>{last ? <>last · {last.category}{last.type !== 'win' ? ` ${Math.round(last.objectiveIntensity)}` : ''} · {fmtMin(evMin(last)!, true)}</> : 'nothing logged yet'}</span>
        </div>
        <Ribbon events={timed} />
        <div style={{ display: 'flex', gap: 14, marginTop: 2 }}>
          {([['Load', loadN, LOAD], ['Rest', restN, REST]] as const).map(([l, a, c]) => (
            <div key={l} className="stat" style={{ flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}><b>{a.length}</b><span>{l} · Σ{sum(a)}</span></div>
              <div className="bar" style={{ width: '100%', marginTop: 4 }}><i style={{ width: `${(sum(a) / cap) * 100}%`, background: `linear-gradient(90deg, ${c}aa, ${c})` }} /></div>
            </div>
          ))}
          <div className="stat" style={{ width: 54 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}><b>{winN.length}</b><span>Wins</span></div>
            <div style={{ marginTop: 3, color: BRASS, fontSize: 11, letterSpacing: 1, height: 8, lineHeight: '8px' }}>{'★'.repeat(Math.min(5, winN.length)) || '·'}</div>
          </div>
        </div>
      </div>

      <div className="grow" />

      <div>
        <div className="sect"><span style={{ width: 6, height: 6, background: LOAD, transform: 'rotate(45deg)' }} /><span className="caps">Load</span><span className="caps" style={{ order: 3, opacity: .7 }}>hold · slide</span></div>
        <div className="grid5">{loadCells.map(med)}{med(win)}</div>
      </div>
      <div>
        <div className="sect"><span style={{ width: 6, height: 6, background: REST, transform: 'rotate(45deg)' }} /><span className="caps">Rest</span></div>
        <div className="grid5">{restCells.map(med)}</div>
      </div>

      <button className="codex press" onClick={onDump} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, height: 44, padding: 0, flex: 'none' }}>
        <Quill /><span className="serif" style={{ fontSize: 16 }}>Dump the day</span><span className="mute" style={{ fontSize: 12 }}>voice or text</span>
      </button>

      {scrub && <ScrubDial s={scrub} anchors={state.config.scales[scrub.cell.type === 'recovery' ? 'recovery' : 'training'].objective} hasLast={!!last} />}

      {bursts.map(b => (
        <div key={b.id} className="burst" style={{ left: b.x, top: b.y }}>
          {Array.from({ length: 8 }, (_, i) => {
            const a = (-90 + (i - 3.5) * 22) * Math.PI / 180, d = 60 + (i % 3) * 22;
            return <i key={i} style={{ ['--dx' as string]: `${Math.cos(a) * d}px`, ['--dy' as string]: `${Math.sin(a) * d - 30}px`, ['--r' as string]: `${(i - 4) * 18}deg`, animationDelay: `${i * 25}ms`, marginLeft: -7, marginTop: -7 }}>
              {i % 2 ? <Butterfly c={b.color} s={14} /> : <svg width="8" height="8" viewBox="0 0 8 8"><path d="M4 0 L5 3 L8 4 L5 5 L4 8 L3 5 L0 4 L3 3Z" fill={b.color} /></svg>}
            </i>;
          })}
        </div>
      ))}

      {toast && (
        <div className="toast" key={toast.text}>
          <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden><path d="M16 3 L18.6 13.4 L29 16 L18.6 18.6 L16 29 L13.4 18.6 L3 16 L13.4 13.4Z" fill="#E2C98E" /></svg>
          <span style={{ fontSize: 14 }}>{toast.undo ? <>Logged <b className="serif" style={{ fontWeight: 600 }}>{toast.text}</b></> : toast.text}</span>
          {toast.undo && <button className="u press" onClick={undo}>Undo</button>}
        </div>
      )}
    </div>
  );
};

/* ---------- today's ribbon: logs drawn on a 6am–midnight line ---------- */
const Ribbon = ({ events }: { events: Event[] }) => {
  const W = 340, Y = 30;
  const mins = events.map(e => evMin(e)!);
  const lo = Math.min(360, ...mins.map(m => Math.floor(m / 180) * 180)), hi = 1440;
  const x = (m: number) => 10 + ((Math.max(lo, Math.min(hi, m)) - lo) / (hi - lo)) * (W - 20);
  const now = new Date(), nm = now.getHours() * 60 + now.getMinutes();
  const ticks = []; for (let t = lo; t <= hi; t += 180) ticks.push(t);
  return (
    <div className="ribbon">
      <svg viewBox={`0 0 ${W} 66`} preserveAspectRatio="xMidYMid meet" aria-label="Today's timeline">
        <path d={`M10 ${Y} C 90 ${Y - 4}, 170 ${Y + 4}, 250 ${Y - 1} S 322 ${Y}, ${W - 10} ${Y}`} stroke={BRASS} strokeWidth="1.3" fill="none" opacity=".7" />
        {ticks.map(t => (
          <g key={t}>
            <line x1={x(t)} x2={x(t)} y1={Y - 3} y2={Y + 3} stroke={BRASS} strokeWidth="1" opacity=".6" />
            <text x={x(t)} y={62} fontSize="8.5" textAnchor="middle" fill="#8A7A5C" fontFamily="Inter, sans-serif">{fmtMin(t, true)}</text>
          </g>
        ))}
        {nm >= lo && (
          <g opacity=".55">
            <line x1={x(nm)} x2={x(nm)} y1={4} y2={52} stroke="#3B4250" strokeWidth="1" strokeDasharray="2 3" />
            <path d={`M${x(nm)} ${Y - 4} l4 4 l-4 4 l-4 -4z`} fill="#3B4250" />
          </g>
        )}
        {events.length === 0 && <text x={W / 2} y={16} fontSize="10.5" textAnchor="middle" fill="#8A7A5C" fontFamily="Lora, serif" fontStyle="italic">your day draws itself here</text>}
        {events.map((e, i) => {
          const cx = x(evMin(e)!), lvl = Math.max(1, Math.round(e.objectiveIntensity || 1));
          if (e.type === 'win') return <path key={e.id} className="dot" style={{ animationDelay: `${i * 20}ms` }} d={`M${cx} ${Y - 7} L${cx + 2} ${Y - 2} L${cx + 7} ${Y} L${cx + 2} ${Y + 2} L${cx} ${Y + 7} L${cx - 2} ${Y + 2} L${cx - 7} ${Y} L${cx - 2} ${Y - 2}Z`} fill={BRASS} stroke="#FFF8EA" strokeWidth=".8" />;
          const up = e.type === 'training', cy = up ? Y - 6 - lvl * 1.9 : Y + 6 + lvl * 1.4, c = up ? LOAD : REST;
          return (
            <g key={e.id}>
              <line x1={cx} x2={cx} y1={Y} y2={cy} stroke={c} strokeWidth="1" opacity=".45" />
              <circle className="dot" style={{ animationDelay: `${i * 20}ms` }} cx={cx} cy={cy} r={2.6 + lvl * .28} fill={c} stroke="#FFF8EA" strokeWidth="1.2" />
            </g>
          );
        })}
      </svg>
    </div>
  );
};

/* ---------- scrub dial overlay ---------- */
const ScrubDial = ({ s, anchors, hasLast }: { s: Scrub; anchors: { value: number; label: string; description: string }[]; hasLast: boolean }) => {
  const isWin = s.cell.type === 'win';
  const step = Math.round(s.raw), frac = s.raw - step;
  const cur = s.startMin + step * 30;
  const a = anchors.find(x => x.value === s.lvl);
  const CY = 262;
  const hot = s.cell.type === 'training' ? '#E9A27F' : '#A9BCD6';
  const tickX = (v: number) => `calc(22px + (100% - 44px) * ${(v - 0.5) / 10})`;
  return (
    <div className="scrub" style={{ ['--hot' as string]: isWin ? '#F0D99C' : hot }}>
      <div className="scrub-head">
        <div className="nm">{s.cell.name}</div>
        <div className="rd">{!isWin && <><b>{s.lvl}</b> / 10 · </>}{fmtMin(cur)}{step !== 0 && <span style={{ opacity: .6, fontSize: 13 }}> ({step > 0 ? '+' : '−'}{Math.abs(step) * 30 >= 60 ? `${Math.abs(step) * 30 / 60}h` : `${Math.abs(step) * 30}m`})</span>}</div>
        <div className="an">{isWin ? 'A small victory. Slide up or down to set the time.' : a ? <><b style={{ fontWeight: 600 }}>{a.label}.</b> {a.description}</> : ''}</div>
      </div>

      <div className="dial" style={{ top: 0, height: '100%' }}>
        {[-3, -2, -1, 0, 1, 2, 3].map(k => {
          const y = CY + (k - frac) * 34;
          const dist = Math.abs(k - frac);
          return (
            <div key={k} className={`t ${k === 0 ? 'cur' : ''}`} style={{ top: y, opacity: k === 0 ? 1 : Math.max(0, .7 - dist * .2), }}>
              {fmtMin(s.startMin + (step + k) * 30)}{(step + k) === 0 && k !== 0 ? (hasLast ? ' · last' : ' · now') : ''}
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', left: '50%', top: CY - 120, height: 100, borderLeft: '1px dashed rgba(226,201,142,.3)' }} /><div style={{ position: 'absolute', left: '50%', top: CY + 22, height: 100, borderLeft: '1px dashed rgba(226,201,142,.3)' }} />
      <div style={{ position: 'absolute', left: 'calc(50% - 70px)', width: 140, top: CY - 22, height: 44, borderRadius: 12, border: '1px solid rgba(226,201,142,.4)', background: 'rgba(226,201,142,.06)' }} />

      {!isWin && (
        <div className="scale" style={{ top: CY + 192 }}>
          {Array.from({ length: 10 }, (_, i) => {
            const v = i + 1, on = v <= s.lvl;
            return <div key={v} className="seg" style={{ left: `calc(${tickX(v)} - (100% - 44px) / 22)`, width: 'calc((100% - 44px) / 11)', background: on ? `color-mix(in srgb, ${hot} ${40 + v * 6}%, #2E384E)` : 'rgba(239,227,201,.12)' }} />;
          })}
          {Array.from({ length: 10 }, (_, i) => <div key={i} className={`n ${i + 1 === s.lvl ? 'cur' : ''}`} style={{ left: tickX(i + 1) }}>{i + 1}</div>)}
          <div className="puck" style={{ left: tickX(s.lvl), top: -34 }}><span>{s.cell.mono}</span></div>
        </div>
      )}
      {isWin && <div className="puck" style={{ left: '50%', top: CY + 160 }}><span>★</span></div>}

      <div className="scrub-foot">↑ later · ↓ earlier{!isWin && ' · ← → intensity'}<br />let go to log · undo after</div>
    </div>
  );
};

const Quill = () => (
  <svg width="20" height="20" viewBox="0 0 32 32" fill="none" aria-hidden>
    <path d="M26 4 C14 6 8 14 7 25 C16 23 23 16 26 4Z" fill="#B8924A" fillOpacity=".25" stroke="#8A6A2E" strokeWidth="1.4" strokeLinejoin="round" />
    <path d="M7 25 L4 28 M12 19 L20 11" stroke="#8A6A2E" strokeWidth="1.4" strokeLinecap="round" />
  </svg>
);
