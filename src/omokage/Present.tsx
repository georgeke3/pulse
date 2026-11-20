import { useRef, useState } from 'react';
import { useApp } from '../store';
import type { Event, EventType } from '../types';
import { BRASS, LOAD, REST, SERIF, fmtMin, hhmm, nowHalfHour, parseHM, todayStr } from './skins';

const STEP_Y = 50, STEP_X = 33;
interface Cell { name: string; type: EventType; rim: string }
interface Drag { cell: Cell; startMin: number; startLvl: number; dx: number; dy: number }

export const Present = ({ onDump }: { onDump: () => void }) => {
  const { state, addEvent, deleteEvent } = useApp();
  const today = todayStr();
  const events = state.days[today]?.events ?? [];
  const timed = events.filter(e => parseHM(e.custom_data?.time) !== null);
  const last = timed.length ? timed[timed.length - 1] : null;
  const loadN = events.filter(e => e.type === 'training').length;
  const restN = events.filter(e => e.type === 'recovery').length;

  const cells: Cell[] = [
    ...state.config.categories.training.map(n => ({ name: n, type: 'training' as const, rim: LOAD })),
    ...state.config.categories.recovery.map(n => ({ name: n, type: 'recovery' as const, rim: REST })),
  ];
  const win: Cell = { name: 'Win', type: 'win', rim: BRASS };
  const loadCells = cells.filter(c => c.type === 'training'), restCells = cells.filter(c => c.type === 'recovery');
  const pad = (n: number) => Array.from({ length: (5 - (n % 5)) % 5 });

  const [drag, setDrag] = useState<Drag | null>(null);
  const ref = useRef<{ x: number; y: number } | null>(null);

  const lastLevel = (c: Cell): number => {
    const all = Object.keys(state.days).sort().reverse();
    for (const d of all) for (const e of [...state.days[d].events].reverse()) if (e.type === c.type && e.category === c.name) return Math.round(e.objectiveIntensity) || 5;
    return 5;
  };
  const down = (c: Cell) => (e: React.PointerEvent) => {
    (e.currentTarget as Element).setPointerCapture(e.pointerId);
    ref.current = { x: e.clientX, y: e.clientY };
    const lm = last ? parseHM(last.custom_data.time)! : nowHalfHour();
    setDrag({ cell: c, startMin: lm, startLvl: c.type === 'win' ? 5 : lastLevel(c), dx: 0, dy: 0 });
  };
  const move = (e: React.PointerEvent) => { const r = ref.current; if (r) setDrag(d => d && { ...d, dx: e.clientX - r.x, dy: e.clientY - r.y }); };
  const up = (cancel: boolean) => () => {
    const d = drag; ref.current = null; setDrag(null);
    if (!d || cancel) return;
    const min = d.startMin + Math.round(d.dy / STEP_Y) * 30;
    const lvl = Math.max(1, Math.min(10, d.startLvl + Math.round(d.dx / STEP_X)));
    const obj = d.cell.type === 'win' ? 5 : lvl;
    addEvent(today, { type: d.cell.type, category: d.cell.name, objectiveIntensity: obj, intensity: Math.max(1, Math.min(4, Math.ceil(obj / 2.5))), duration: '<1h', custom_data: { time: hhmm(min) }, date: today });
  };

  const medallion = (c: Cell, k: string) => {
    const n = events.filter(e => e.type === c.type && e.category === c.name).length;
    return (
      <div key={k} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
        <button onPointerDown={down(c)} onPointerMove={move} onPointerUp={up(false)} onPointerCancel={up(true)} onContextMenu={e => e.preventDefault()}
          style={{ position: 'relative', width: 50, height: 50, borderRadius: '50%', border: `2.5px solid ${c.rim}`, background: n ? `${c.rim}22` : '#E8DCC4', padding: 0, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none', fontFamily: 'inherit', color: c.rim, fontSize: 13, fontWeight: 600 }}>
          {n > 0 ? n : ''}
        </button>
        <span style={{ fontSize: 11, color: '#5F5A4E', whiteSpace: 'nowrap', maxWidth: 70, overflow: 'hidden', textOverflow: 'ellipsis' }}>{c.name}</span>
      </div>
    );
  };

  const lvlAnchor = (c: Cell, v: number) => state.config.scales[c.type === 'recovery' ? 'recovery' : 'training'].objective.find(a => a.value === v);

  return (
    <>
      <div style={{ flex: 1, padding: '6px 12px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        <div style={{ fontSize: 12, color: '#5F5A4E', minHeight: 15 }}>
          {last ? <>Last: {last.category}{last.type !== 'win' ? ` · level ${Math.round(last.objectiveIntensity)}` : ''} · {fmtMin(parseHM(last.custom_data.time)!)} <button onClick={() => deleteEvent(today, last.id)} style={{ background: 'none', border: 0, color: '#5F5A4E', textDecoration: 'underline', fontSize: 12, padding: '0 0 0 4px', fontFamily: 'inherit' }}>undo</button></> : 'Nothing logged yet today'}
        </div>
        <div style={{ border: '1.5px solid #9C7B3C', borderRadius: 10, padding: '8px 10px', background: '#F0E6D0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>Today</span><span style={{ color: '#5F5A4E' }}>{loadN} load · {restN} rest</span></div>
          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
            {[[loadN, LOAD], [restN, REST]].map(([n, c], i) => (
              <div key={i} style={{ flex: 1, height: 7, borderRadius: 4, background: '#D8CBB0' }}><div style={{ width: `${Math.min(100, (n as number) * 10)}%`, height: 7, borderRadius: 4, background: c as string }} /></div>
            ))}
          </div>
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 12, color: '#5F5A4E' }}>Hold a medallion. Up/down time, left/right intensity.</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px 0', justifyItems: 'center' }}>
          {loadCells.map((c, i) => medallion(c, 'l' + i))}
          {medallion(win, 'win')}
          {pad(loadCells.length + 1).map((_, i) => <div key={'p' + i} />)}
          {restCells.map((c, i) => medallion(c, 'r' + i))}
        </div>
        <button onClick={onDump} style={{ height: 40, borderRadius: 10, border: '1.5px solid #9C7B3C', background: '#F0E6D0', color: '#3B4250', fontSize: 14, fontFamily: 'inherit', marginBottom: 12 }}>Dump the day (voice or text)</button>
      </div>

      {drag && (() => {
        const stepM = Math.round(drag.dy / STEP_Y), lvl = Math.max(1, Math.min(10, drag.startLvl + Math.round(drag.dx / STEP_X)));
        const cur = drag.startMin + stepM * 30, a = lvlAnchor(drag.cell, lvl), isWin = drag.cell.type === 'win';
        const CX = 196, CY = 330;
        const px = CX + Math.max(-165, Math.min(165, drag.dx)) , py = CY + Math.max(-150, Math.min(150, stepM * STEP_Y));
        const rows = [-3, -2, -1, 0, 1, 2, 3];
        return (
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(52,64,90,.98)', color: '#E8DCC4', zIndex: 10, pointerEvents: 'none', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 30, textAlign: 'center', fontFamily: SERIF, fontSize: 26 }}>{drag.cell.name}</div>
            <div style={{ position: 'absolute', left: 0, right: 0, top: 70, textAlign: 'center', fontSize: 18 }}>{isWin ? '' : `level ${lvl} · `}{fmtMin(cur)}</div>
            {!isWin && a && <div style={{ position: 'absolute', left: 16, right: 16, top: 102, textAlign: 'center', fontSize: 12, opacity: .85 }}>{a.label}: {a.description}</div>}
            <div style={{ position: 'absolute', left: CX, top: CY - 150, height: 300, borderLeft: '1.5px dashed #C9A86A' }} />
            {rows.map(k => { const hl = k === stepM;
              return <div key={k} style={{ position: 'absolute', left: CX + 12, top: CY + k * STEP_Y - 8, fontSize: hl ? 14 : 12, fontWeight: hl ? 500 : 400, opacity: hl ? 1 : .6 }}>{fmtMin(drag.startMin + k * 30)}{k === 0 ? (last ? ' (last)' : ' (now)') : ''}</div>; })}
            {!isWin && <>
              <div style={{ position: 'absolute', left: 30, right: 30, top: CY, borderTop: '1.5px dashed #C9A86A' }} />
              <div style={{ position: 'absolute', left: 30, right: 30, top: CY + 22, display: 'flex', justifyContent: 'space-between', fontSize: 11, opacity: .85 }}>
                {Array.from({ length: 10 }, (_, i) => <span key={i} style={{ fontWeight: i + 1 === lvl ? 600 : 400, fontSize: i + 1 === lvl ? 15 : 11, opacity: i + 1 === lvl ? 1 : .7 }}>{i + 1}</span>)}
              </div>
            </>}
            <div style={{ position: 'absolute', left: px - 25, top: py - 25, width: 50, height: 50, borderRadius: '50%', border: '2.5px solid #C9A86A', background: '#F2EEE6' }} />
            <div style={{ position: 'absolute', left: 0, right: 0, bottom: 24, textAlign: 'center', fontSize: 12, opacity: .85, lineHeight: 1.5 }}>{last ? 'Time starts at your last entry.' : 'Time starts at now.'}<br />Slide down for later, up for earlier.<br />{isWin ? '' : 'Slide left or right for intensity. '}Let go to save.</div>
          </div>
        );
      })()}
    </>
  );
};
export type { Event };
