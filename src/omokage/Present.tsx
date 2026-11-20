import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import type { Event, EventType } from '../types';
import { Belt, Fly } from './Art';
import { haptic } from './haptics';
import { DUSK, EMBER, GOLD, INK, INK2, SKY, fmtClock, fmtMin, hhmm, nowHalfHour, parseHM, todayStr } from './skins';

const STEP_Y = 34;     // px of vertical travel per 30 minutes
const MAX_STEP_X = 34; // px per intensity level; shrinks near the edges so 1–10 is always reachable
const HOLD_MS = 170;

interface Cell { name: string; type: EventType; mono: string }
interface Press { cell: Cell; x: number; y: number; active: boolean; timer: number; startMin: number; startLvl: number; stepL: number; stepR: number; el: HTMLElement; lastKey: string; raw: number; lvl: number }
interface Scrub { cell: Cell; startMin: number; startLvl: number; raw: number; lvl: number }
interface Toast { text: string; undo?: { cat: string; type: EventType; time: string } }
interface Burst { id: number; x: number; y: number; color: string }

const RIM: Record<EventType, [string, string]> = { training: [EMBER, '#F3C9B4'], recovery: [SKY, '#C9D7E9'], win: [GOLD, '#F1DDAE'] };
const monos = (names: string[]) => names.map(n => {
  const one = n[0].toUpperCase();
  return names.filter(o => o[0].toUpperCase() === one).length > 1 ? one + (n[1] ?? '').toLowerCase() : one;
});
const evMin = (e: Event) => parseHM(e.custom_data?.time);
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

export const Present = ({ onDump, onPulse }: { onDump: () => void; onPulse: () => void }) => {
  const { state, addEvent, deleteEvent } = useApp();
  const today = todayStr();
  const events = state.days[today]?.events ?? [];
  const timed = events.filter(e => evMin(e) !== null).sort((a, b) => evMin(a)! - evMin(b)!);
  const last = timed.length ? timed[timed.length - 1] : null;
  const answered = Object.keys(state.days[today]?.answers ?? {}).length, nq = state.config.daily_questions.length;

  const load = state.config.categories.training, rest = state.config.categories.recovery;
  const cells: Cell[] = useMemo(() => {
    const lm = monos(load), rm = monos(rest);
    return [{ name: 'Win', type: 'win' as const, mono: '★' },
      ...rest.map((n, i) => ({ name: n, type: 'recovery' as const, mono: rm[i] })),
      ...load.map((n, i) => ({ name: n, type: 'training' as const, mono: lm[i] })).reverse()];
  }, [load, rest]);

  const [screenRef, scr] = useSize<HTMLDivElement>();
  const [ringRef, ring] = useSize<HTMLDivElement>();
  const press = useRef<Press | null>(null);
  const [scrub, setScrub] = useState<Scrub | null>(null);
  const [held, setHeld] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [bursts, setBursts] = useState<Burst[]>([]);
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
    press.current = {
      cell: c, x: e.clientX, y: e.clientY, active: false, el: e.currentTarget, lastKey: '', raw: 0, lvl: startLvl,
      startMin: last ? evMin(last)! : nowHalfHour(), startLvl,
      stepL: startLvl > 1 ? Math.min(MAX_STEP_X, (e.clientX - 12) / (startLvl - 1)) : MAX_STEP_X,
      stepR: startLvl < 10 ? Math.min(MAX_STEP_X, (vw - 12 - e.clientX) / (10 - startLvl)) : MAX_STEP_X,
      timer: window.setTimeout(activate, HOLD_MS),
    };
  };
  const onMove = (e: React.PointerEvent) => {
    const p = press.current; if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y;
    if (!p.active) { if (Math.hypot(dx, dy) > 10) { clearTimeout(p.timer); activate(); } else return; }
    const raw = Math.max(-40, Math.min(40, -dy / STEP_Y));   // up = later, like an iOS picker
    const lvl = p.cell.type === 'win' ? 1 : Math.max(1, Math.min(10, p.startLvl + (dx < 0 ? -Math.round(-dx / p.stepL) : Math.round(dx / p.stepR))));
    const key = `${Math.round(raw)}|${lvl}`;
    if (key !== p.lastKey) { if (p.lastKey) haptic(4); p.lastKey = key; }
    p.raw = raw; p.lvl = lvl;
    setScrub(s => s && { ...s, raw, lvl });
  };
  const finish = (cancel: boolean) => () => {
    const p = press.current; press.current = null; setHeld(null); setScrub(null);
    if (!p) return;
    clearTimeout(p.timer);
    if (cancel) return;
    if (!p.active) { setToast({ text: 'Hold a node, then slide' }); return; }
    const min = p.startMin + Math.round(p.raw) * 30, time = hhmm(min), isWin = p.cell.type === 'win';
    addEvent(today, {
      type: p.cell.type, category: p.cell.name, objectiveIntensity: isWin ? 1 : p.lvl,
      intensity: isWin ? 1 : Math.max(1, Math.min(4, Math.ceil(p.lvl / 2.5))),
      duration: '<1h', custom_data: { time }, date: today,
    });
    haptic(14);
    const r = p.el.getBoundingClientRect(), sr = screenRef.current!.getBoundingClientRect();
    const b = { id: Date.now(), x: r.left - sr.left + r.width / 2, y: r.top - sr.top + r.height / 2, color: RIM[p.cell.type][0] };
    setBursts(v => [...v, b]); setTimeout(() => setBursts(v => v.filter(x => x.id !== b.id)), 1700);
    setToast({ text: `${p.cell.name}${isWin ? '' : ` · ${p.lvl}`} · ${fmtMin(min)}`, undo: { cat: p.cell.name, type: p.cell.type, time } });
  };
  const undo = () => {
    const u = toast?.undo; if (!u) return;
    const ev = [...(state.days[today]?.events ?? [])].reverse().find(e => e.category === u.cat && e.type === u.type && e.custom_data?.time === u.time);
    if (ev) deleteEvent(today, ev.id);
    setToast({ text: 'Removed' });
  };

  // ring geometry: equal arc-length spacing on an ellipse around the crest
  const N = cells.length;
  const sz = N <= 18 ? 42 : N <= 22 ? 38 : 34;
  const cx = ring.w / 2, cy = ring.h / 2;
  const rx = Math.max(90, Math.min(122, ring.w / 2 - 74)), ry = Math.max(100, Math.min(156, ring.h / 2 - 32));
  const pos = useMemo(() => {
    const S = 1600, a0 = -Math.PI / 2, P: [number, number, number][] = [];
    for (let i = 0; i <= S; i++) { const a = a0 + 2 * Math.PI * i / S; P.push([cx + rx * Math.cos(a), cy + ry * Math.sin(a), a]); }
    const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + Math.hypot(P[i][0] - P[i - 1][0], P[i][1] - P[i - 1][1]));
    const out: [number, number, number][] = []; let j = 0;
    for (let k = 0; k < N; k++) { const t = L[S] * k / N; while (L[j] < t) j++; out.push(P[j]); }
    return out;
  }, [cx, cy, rx, ry, N]);
  const crest = Math.min(120, 2 * Math.min(rx, ry) - 96);

  const counts = (c: Cell) => events.filter(e => e.type === c.type && e.category === c.name).length;
  const loadN = events.filter(e => e.type === 'training').length, restN = events.filter(e => e.type === 'recovery').length, winN = events.filter(e => e.type === 'win').length;

  return (
    <div className="screen" ref={screenRef} style={{ padding: '0 0 10px' }}>
      <DayRibbon events={timed} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '0 24px', height: 22, flex: 'none' }}>
        <span className="it" style={{ fontSize: 15 }}>
          <b className="serif" style={{ fontStyle: 'normal', fontWeight: 600, color: EMBER }}>{loadN}</b> load · <b className="serif" style={{ fontStyle: 'normal', fontWeight: 600, color: SKY }}>{restN}</b> rest · <b className="serif" style={{ fontStyle: 'normal', fontWeight: 600, color: GOLD }}>{winN}</b> win{winN === 1 ? '' : 's'}
        </span>
        <span style={{ fontSize: 11, color: INK2 }}>{last ? `last · ${last.category}${last.type !== 'win' ? ' ' + Math.round(last.objectiveIntensity) : ''} · ${fmtMin(evMin(last)!, true)}` : 'nothing logged yet'}</span>
      </div>

      <div ref={ringRef} className="grow" style={{ position: 'relative' }}>
        <div className="wash" style={{ left: cx - 120, top: cy - 120, width: 240, height: 240, background: 'rgba(200,161,90,.14)' }} />
        <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
          <polygon points={pos.map(p => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ')} fill="none" stroke={INK} strokeWidth=".7" opacity=".18" />
          <ellipse cx={cx} cy={cy} rx={rx + 34} ry={ry + 30} fill="none" stroke={GOLD} strokeWidth=".8" opacity=".35" strokeDasharray="1 5" />
        </svg>
        {cells.map((c, k) => {
          const [x, y, a] = pos[k] ?? [0, 0, 0];
          const [r, f] = RIM[c.type], n = counts(c), id = c.type + c.name;
          const co = Math.cos(a), si = Math.sin(a), off = sz / 2 + 6;
          const lab: React.CSSProperties = co > .35 ? { left: x + off, top: y, transform: 'translateY(-50%)' }
            : co < -.35 ? { left: x - off, top: y, transform: 'translate(-100%,-50%)' }
            : { left: x, top: y + (si > 0 ? off + 3 : -off - 3), transform: 'translate(-50%,-50%)' };
          return (
            <span key={id}>
              <button className={`node ${held === id ? 'held' : ''}`} aria-label={`Log ${c.name}`}
                style={{ left: x, top: y, ['--r' as string]: r, ['--f' as string]: f, ['--sz' as string]: `${sz}px` }}
                onPointerDown={onDown(c)} onPointerMove={onMove} onPointerUp={finish(false)} onPointerCancel={finish(true)} onContextMenu={e => e.preventDefault()}>
                <i /><b style={{ fontSize: c.mono.length > 1 ? 12.5 : 16, marginTop: n ? -4 : 0 }}>{c.mono}</b>
                {n > 0 && <span className="pips">{Array.from({ length: Math.min(n, 4) }, (_, i) => <s key={i} />)}</span>}
              </button>
              <span className="nl" style={lab}>{c.name.length > 10 ? c.name.split(' ')[0] : c.name}</span>
            </span>
          );
        })}
        <button className="crest" onClick={onPulse} style={{ left: cx - crest / 2, top: cy - crest / 2, width: crest, height: crest }}>
          <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5Z" fill={GOLD} /></svg>
          <span className="it" style={{ fontSize: 15 }}>{answered >= nq ? 'Pulse done' : 'Evening pulse'}</span>
          <span style={{ display: 'flex', gap: 3, marginTop: 3 }}>{Array.from({ length: nq }, (_, k) => <i key={k} style={{ width: 5, height: 5, borderRadius: 3, background: k < answered ? GOLD : 'rgba(43,50,71,.15)' }} />)}</span>
          <span className="caps" style={{ fontSize: 8.5, marginTop: 3 }}>{answered} of {nq}</span>
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 24px', height: 40, flex: 'none' }}>
        <span className="caps">hold a node · slide</span>
        <button className="chip press" onClick={onDump} style={{ height: 36, gap: 8, background: '#fff', boxShadow: '0 0 0 1px rgba(43,50,71,.14),0 6px 16px rgba(43,50,71,.08)' }}>
          <svg width="15" height="15" viewBox="0 0 32 32" fill="none" aria-hidden="true"><path d="M26 4 C14 6 8 14 7 25 C16 23 23 16 26 4Z" stroke={INK} strokeWidth="1.6" /><path d="M7 25 L4 28 M12 19 L20 11" stroke={INK} strokeWidth="1.6" /></svg>
          <span className="it" style={{ fontSize: 14 }}>Dump the day</span>
        </button>
      </div>

      {scrub && <ScrubVeil s={scrub} w={scr.w} h={scr.h} anchors={state.config.scales[scrub.cell.type === 'recovery' ? 'recovery' : 'training'].objective} hasLast={!!last} />}

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

      {toast && (
        <div className="toast" key={toast.text} role="status">
          <svg width="16" height="16" viewBox="-16 -13 32 26" aria-hidden="true"><Fly x={0} y={0} c={EMBER} /></svg>
          <span>{toast.undo ? <>Logged <span className="it">{toast.text}</span></> : toast.text}</span>
          {toast.undo && <button className="u press" onClick={undo}>Undo</button>}
        </div>
      )}
    </div>
  );
};

/* The day drawn as a ribbon: load above, rest below, wins as stars, butterflies trailing after now. */
const DayRibbon = ({ events }: { events: Event[] }) => {
  const W = 393, Y = 58;
  const mins = events.map(e => evMin(e)!);
  const lo = Math.min(360, ...mins.map(m => Math.floor(m / 180) * 180)), hi = 1440;
  const X = (m: number) => 28 + ((Math.max(lo, Math.min(hi, m)) - lo) / (hi - lo)) * (W - 56);
  const d = `M${X(lo)} ${Y} C ${X(lo + 200)} ${Y - 18}, ${X(lo + 400)} ${Y + 16}, ${X(960)} ${Y - 6} S ${X(1260)} ${Y + 4}, ${X(1440)} ${Y - 10}`;
  const now = new Date(), nm = now.getHours() * 60 + now.getMinutes();
  const ticks: number[] = []; for (let t = lo; t < hi; t += 180) ticks.push(t);
  const lbl = (t: number) => (t === 720 ? 'noon' : fmtMin(t, true).replace('m', ''));
  return (
    <div style={{ height: 118, flex: 'none', position: 'relative' }}>
      <svg viewBox={`0 0 ${W} 118`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', overflow: 'visible' }} aria-label="Today, drawn as a ribbon">
        <Belt d={d} c={GOLD} w={9} o={.35} />
        {ticks.map(t => <text key={t} x={X(t)} y={Y + 46} fontSize="9" textAnchor="middle" fill={INK2} fontFamily="Inter, sans-serif" letterSpacing=".08em">{lbl(t)}</text>)}
        {events.length === 0 && <text x={W / 2} y={Y - 26} fontSize="12" textAnchor="middle" fill={INK2} fontFamily="Lora, serif" fontStyle="italic">your day draws itself here</text>}
        {events.map(e => {
          const x = X(evMin(e)!), lvl = Math.max(1, Math.round(e.objectiveIntensity || 1));
          if (e.type === 'win') return <path key={e.id} d={`M${x} ${Y - 8} L${x + 2.2} ${Y - 2.2} L${x + 8} ${Y} L${x + 2.2} ${Y + 2.2} L${x} ${Y + 8} L${x - 2.2} ${Y + 2.2} L${x - 8} ${Y} L${x - 2.2} ${Y - 2.2}Z`} fill={GOLD} stroke="#fff" strokeWidth="1" />;
          const up = e.type === 'training', cy = up ? Y - 10 - lvl * 3.6 : Y + 10 + lvl * 2.6, c = up ? EMBER : SKY;
          return (
            <g key={e.id}>
              <path d={`M${x} ${Y} Q ${x + 6} ${(Y + cy) / 2} ${x} ${cy}`} stroke={c} strokeWidth="1" fill="none" opacity=".5" />
              <circle cx={x} cy={cy} r={3 + lvl * .45} fill={c} stroke="#fff" strokeWidth="1.5" />
            </g>
          );
        })}
        {nm >= lo && (
          <g>
            <line x1={X(nm)} x2={X(nm)} y1={Y - 50} y2={Y + 30} stroke={INK} strokeWidth=".8" strokeDasharray="2 3" opacity=".4" />
            <text x={X(nm)} y={Y - 54} fontSize="9" textAnchor="middle" fill={INK} fontFamily="Lora, serif" fontStyle="italic">now</text>
            {X(nm) < W - 60 && <><Fly x={X(nm) + 22} y={Y - 26} s={.55} c={DUSK} o={.5} /><Fly x={X(nm) + 46} y={Y - 44} s={.4} c={DUSK} o={.35} d={1.2} /></>}
          </g>
        )}
      </svg>
    </div>
  );
};

/* Frosted veil while holding a node: a time tape (up = later) and a 1–10 arc of growing beads. */
const ScrubVeil = ({ s, w, h, anchors, hasLast }: { s: Scrub; w: number; h: number; anchors: { value: number; label: string; description: string }[]; hasLast: boolean }) => {
  const isWin = s.cell.type === 'win';
  const step = Math.round(s.raw), frac = s.raw - step, cur = s.startMin + step * 30;
  const a = anchors.find(x => x.value === s.lvl);
  const [rim, fill] = RIM[s.cell.type];
  const tY = Math.round(h * .40), bY = Math.round(h * .69);
  const bx = (v: number) => 24 + (v - 1) * ((w - 48) / 9);
  const by = (v: number) => bY - Math.sin((v - 1) / 9 * Math.PI) * 18;
  const big = fmtClock(cur);
  return (
    <div className="veil">
      <div style={{ position: 'absolute', left: 0, right: 0, top: 4, textAlign: 'center', padding: '0 30px' }}>
        <div className="caps">logging</div>
        <div className="serif" style={{ fontSize: 36, marginTop: 2 }}>{s.cell.name}</div>
        <div className="it" style={{ fontSize: 13.5, color: INK2, marginTop: 4, lineHeight: 1.4, minHeight: 38 }}>{isWin ? 'A small victory, kept.' : a ? `${a.label}: ${a.description}` : ''}</div>
      </div>
      {[-3, -2, -1, 1, 2, 3].map(k => {
        const o = k - frac, y = tY + o * STEP_Y + Math.sign(o) * 18, m = s.startMin + (step + k) * 30;
        return <div key={k} className="tape" style={{ top: y, fontSize: 13, color: INK2, opacity: Math.max(0, .8 - Math.abs(k - frac) * .22) }}>{fmtClock(m).t}{step + k === 0 ? (hasLast ? ' · last' : ' · now') : ''}</div>;
      })}
      <div className="tape" style={{ top: tY }}>
        <span className="serif" style={{ fontSize: 38, letterSpacing: '-.01em' }}>{big.t}</span><span className="it" style={{ fontSize: 16, color: INK2 }}> {big.ap}</span>
      </div>
      {step !== 0 && <div style={{ position: 'absolute', left: w / 2 + 92, top: tY - 6, fontSize: 10, letterSpacing: '.12em', color: GOLD }}>{step > 0 ? '+' : '−'}{Math.abs(step) * 30 >= 60 ? `${(Math.abs(step) * 30 / 60).toFixed(Math.abs(step) % 2 ? 1 : 0)} H` : '30 MIN'}</div>}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true">
        <path d={`M${w / 2 - 46} ${tY - 28} Q${w / 2} ${tY - 40} ${w / 2 + 46} ${tY - 28}`} stroke={GOLD} fill="none" />
        <path d={`M${w / 2 - 46} ${tY + 32} Q${w / 2} ${tY + 44} ${w / 2 + 46} ${tY + 32}`} stroke={GOLD} fill="none" />
        {!isWin && <>
          <path d={`M${bx(1)} ${bY} Q${w / 2} ${bY - 36} ${bx(10)} ${bY}`} stroke={INK} strokeWidth=".7" fill="none" opacity=".25" />
          {Array.from({ length: 10 }, (_, i) => {
            const v = i + 1, on = v <= s.lvl, r = 4 + v * .9;
            return (
              <g key={v}>
                <circle cx={bx(v)} cy={by(v)} r={r} fill={on ? rim : 'rgba(43,50,71,.14)'} opacity={on ? .35 + v * .065 : 1} />
                <text x={bx(v)} y={by(v) + r + 15} fontSize={v === s.lvl ? 12 : 10} fontWeight={v === s.lvl ? 600 : 400} textAnchor="middle" fill={v === s.lvl ? INK : INK2} fontFamily="Inter, sans-serif">{v}</text>
              </g>
            );
          })}
        </>}
      </svg>
      <div className="node held" style={{ left: isWin ? w / 2 : Math.max(40, Math.min(w - 40, bx(s.lvl))), top: isWin ? bY - 10 : by(s.lvl) - 52, ['--r' as string]: rim, ['--f' as string]: fill, ['--sz' as string]: '60px', fontSize: 22, transition: 'left .12s', boxShadow: `0 0 0 1.5px ${rim},0 0 0 6px #FBFAF7,0 0 0 7px rgba(200,161,90,.6),0 18px 30px rgba(43,50,71,.22)` }}>
        <i /><b>{s.cell.mono}</b>
      </div>
      {!isWin && <div style={{ position: 'absolute', left: 0, right: 0, top: bY + 52, textAlign: 'center' }}><span className="serif" style={{ fontSize: 22, color: rim }}>{s.lvl}</span><span className="it" style={{ fontSize: 15 }}> · {a?.label ?? ''}</span></div>}
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 14, textAlign: 'center', fontSize: 11, color: INK2, lineHeight: 1.7 }}>
        ↑ later &nbsp;·&nbsp; ↓ earlier{!isWin && <> &nbsp;·&nbsp; ← → intensity</>}<br /><span className="it" style={{ fontSize: 12.5 }}>let go to log, undo after</span>
      </div>
    </div>
  );
};
