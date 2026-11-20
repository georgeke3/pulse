import { useLayoutEffect, useRef, useState, type PointerEvent as RPE } from 'react';
import type { EventType } from '../types';
import { catArt } from './catArt';
import { Mic } from './Mic';
import { Sheet } from './Sheet';
import { EMBER, GOLD, INK, INK2, SKY } from './skins';

export const STEP_Y = 16;
export const MAX_STEP_X = 34;  // px per intensity level (shrinks near the edges)
export const RIM: Record<EventType, [string, string]> = { training: [EMBER, '#F3C9B4'], recovery: [SKY, '#C9D7E9'], win: [GOLD, '#F1DDAE'] };

export interface Cell { name: string; type: EventType; mono: string }
export interface Draft { cell: Cell; lvl: number; note: string; editId?: string; from?: { x: number; y: number } }

export const durLabel = (n: number) => `${n} ${n === 1 ? 'hour' : 'hours'}`;

interface Props {
  d: Draft;
  anchors: { value: number; label: string; description: string }[];
  onDown: (e: RPE<HTMLDivElement>) => void; onMove: (e: RPE<HTMLDivElement>) => void; onUp: () => void;
  onNote: (t: string) => void; onConfirm: () => void; onClose: () => void;
}

const ZH = 208;  // height of the scrubbing zone

/** The logging sheet: scrub the intensity, say or type what happened, confirm. Nothing saves until you press the button. */
export const LogSheet = ({ d, anchors, onDown, onMove, onUp, onNote, onConfirm, onClose }: Props) => {
  const isWin = d.cell.type === 'win', [rim, fill] = RIM[d.cell.type];
  const a = anchors.find(x => x.value === d.lvl);
  const zone = useRef<HTMLDivElement>(null);
  const [zw, setZw] = useState(345);
  useLayoutEffect(() => {
    const el = zone.current; if (!el) return;
    const f = () => setZw(el.clientWidth); f();
    const ro = new ResizeObserver(f); ro.observe(el); return () => ro.disconnect();
  }, []);
  const bY = 120;
  const bx = (v: number) => 34 + (v - 1) * ((zw - 68) / 9);
  const by = (v: number) => bY - Math.sin((v - 1) / 9 * Math.PI) * 16;
  const art = catArt(d.cell.type, d.cell.name);
  const face = art ? <img className="catart" src={art} alt="" style={{ width: isWin ? 50 : 44, height: isWin ? 50 : 44 }} /> : <b>{d.cell.mono}</b>;
  const add = (t: string) => onNote(d.note.trim() ? `${d.note.trimEnd()} ${t}` : t);

  return (
    <Sheet mode="present">
      <div style={{ position: 'relative', flex: 'none', textAlign: 'center', padding: '0 64px' }}>
        <button className="ls-x press" aria-label="Close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3 L13 13 M13 3 L3 13" stroke={INK} strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
        <div className="caps" style={{ paddingTop: 4 }}>{d.editId ? 'editing' : 'logging'}</div>
        <div className="serif" style={{ fontSize: 30, marginTop: 4 }}>{d.cell.name}</div>
        <div className="it" style={{ fontSize: 13, color: INK2, marginTop: 3, lineHeight: 1.35, height: 36, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{isWin ? 'A small victory, kept.' : a ? `${a.label}: ${a.description}` : ''}</div>
      </div>

      <div ref={zone} onPointerDown={isWin ? undefined : onDown} onPointerMove={isWin ? undefined : onMove} onPointerUp={isWin ? undefined : onUp} onPointerCancel={isWin ? undefined : onUp}
        style={{ position: 'relative', flex: 'none', height: isWin ? 110 : ZH, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
        {isWin ? (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <div className="node held" style={{ position: 'relative', margin: 0, ['--r' as string]: rim, ['--f' as string]: fill, ['--sz' as string]: '64px' }}><i />{face}</div>
          </div>
        ) : (
          <>
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} aria-hidden="true">
              <path d={`M${bx(1)} ${bY} Q${(bx(1) + bx(10)) / 2} ${bY - 34} ${bx(10)} ${bY}`} stroke={INK} strokeWidth=".7" fill="none" opacity=".25" />
              {Array.from({ length: 10 }, (_, i) => {
                const v = i + 1, on = v <= d.lvl, r = 4 + v * .85;
                return (
                  <g key={v}>
                    <circle cx={bx(v)} cy={by(v)} r={r} fill={on ? rim : 'rgba(43,50,71,.14)'} opacity={on ? .35 + v * .065 : 1} />
                    <text x={bx(v)} y={by(v) + r + 14} fontSize={v === d.lvl ? 12 : 10} fontWeight={v === d.lvl ? 600 : 400} textAnchor="middle" fill={v === d.lvl ? INK : INK2} fontFamily="Inter, sans-serif">{v}</text>
                  </g>
                );
              })}
            </svg>
            <div className="node held" style={{ left: Math.max(38, Math.min(zw - 38, bx(d.lvl))), top: by(d.lvl) - 50, ['--r' as string]: rim, ['--f' as string]: fill, ['--sz' as string]: '56px', transition: 'left .12s', pointerEvents: 'none', boxShadow: `0 0 0 1.5px ${rim},0 0 0 6px #FBFAF7,0 0 0 7px rgba(200,161,90,.6),0 16px 28px rgba(43,50,71,.2)` }}><i />{face}</div>
            <div style={{ position: 'absolute', left: 0, right: 0, top: bY + 44, textAlign: 'center', pointerEvents: 'none' }}>
              <span className="serif" style={{ fontSize: 21, color: rim }}>{d.lvl}</span><span className="it" style={{ fontSize: 15 }}> · {a?.label ?? ''}</span>
              <div style={{ fontSize: 11, color: INK2, marginTop: 2 }}>drag ← → anywhere here</div>
            </div>
          </>
        )}
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', padding: '2px 20px 10px' }}>
        <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', borderRadius: 20, background: 'rgba(255,255,255,.75)', boxShadow: 'inset 0 0 0 1px rgba(43,50,71,.14)', padding: '14px 16px' }}>
          <textarea value={d.note} onChange={e => onNote(e.target.value)} placeholder="What happened? Type, or hold the mic and say it…" aria-label="Details of what happened" style={{ fontSize: 17, paddingRight: 58, paddingBottom: 8 }} />
          <div style={{ position: 'absolute', right: 10, bottom: 10 }}><Mic onText={add} size={48} /></div>
        </div>
      </div>

      <div style={{ flex: 'none', display: 'flex', gap: 10, padding: '0 20px calc(12px + var(--sb))' }}>
        <button className="chip press" style={{ height: 54, flex: '0 0 30%', fontSize: 15 }} onMouseDown={e => e.preventDefault()} onClick={onClose}>Cancel</button>
        <button className="chip on press" style={{ height: 54, flex: 1, fontSize: 16 }} onMouseDown={e => e.preventDefault()} onClick={onConfirm}>{d.editId ? 'Save' : 'Log it'}</button>
      </div>
    </Sheet>
  );
};
