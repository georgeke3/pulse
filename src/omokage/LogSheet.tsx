import type { PointerEvent as RPE } from 'react';
import type { EventType } from '../types';
import { catArt } from './catArt';
import { EMBER, GOLD, INK, INK2, SKY, fmtClock } from './skins';

export const STEP_Y = 16;      // px of thumb travel per hour: a whole day fits in ~380px
export const MAX_STEP_X = 34;  // px per intensity level (shrinks near the edges)
export const RIM: Record<EventType, [string, string]> = { training: [EMBER, '#F3C9B4'], recovery: [SKY, '#C9D7E9'], win: [GOLD, '#F1DDAE'] };

export interface Cell { name: string; type: EventType; mono: string }
export interface Draft { cell: Cell; h: number; lvl: number; dur: number; step: 'when' | 'dur'; editId?: string; origH?: number; origRem?: number; from?: { x: number; y: number } }

const hr = (h: number) => { const c = fmtClock(h * 60); return `${c.t.replace(':00', '')} ${c.ap}`; };
export const durLabel = (n: number) => `${n} ${n === 1 ? 'hour' : 'hours'}`;

interface Props {
  d: Draft; w: number; h: number;
  anchors: { value: number; label: string; description: string }[];
  onDown: (e: RPE<HTMLDivElement>) => void; onMove: (e: RPE<HTMLDivElement>) => void; onUp: () => void;
  onNext: () => void; onBack: () => void; onClose: () => void;
}

/** The logging sheet. Stays open after you let go: drag to set the hour (and intensity), confirm, then set how long. */
export const LogSheet = ({ d, w, h, anchors, onDown, onMove, onUp, onNext, onBack, onClose }: Props) => {
  const isWin = d.cell.type === 'win', [rim, fill] = RIM[d.cell.type];
  const a = anchors.find(x => x.value === d.lvl);
  const when = d.step === 'when';
  const tY = Math.round(h * .345), bY = Math.round(h * .645);
  const rulerH = 23 * STEP_Y, rt = Math.round((h - rulerH) / 2) - 24, rx = w - 30;
  const bx = (v: number) => 24 + (v - 1) * ((w - 48 - 56) / 9);
  const by = (v: number) => bY - Math.sin((v - 1) / 9 * Math.PI) * 16;
  const ry = (hh: number) => rt + (23 - hh) * STEP_Y;
  const endH = d.h + d.dur;
  const finalLabel = d.editId ? 'Save' : 'Log it';
  const art = catArt(d.cell.type, d.cell.name);
  const nb = (k: number) => k * 24 + Math.sign(k) * 18;

  return (
    <div className="logsheet" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} style={{ touchAction: 'none' }}>
      <button className="ls-x press" aria-label="Close" onPointerDown={e => e.stopPropagation()} onClick={onClose}>
        <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3 L13 13 M13 3 L3 13" stroke={INK} strokeWidth="1.6" strokeLinecap="round" /></svg>
      </button>

      <div style={{ position: 'absolute', left: 0, right: 0, top: 8, textAlign: 'center', padding: '0 64px', pointerEvents: 'none' }}>
        <div className="caps">{d.editId ? 'editing' : 'logging'} · {when ? (isWin ? 'when' : 'when & how hard') : 'how long'}</div>
        <div className="serif" style={{ fontSize: 30, marginTop: 4 }}>{d.cell.name}</div>
        <div className="it" style={{ fontSize: 13, color: INK2, marginTop: 3, lineHeight: 1.35, height: 36, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{isWin ? 'A small victory, kept.' : a ? `${a.label}: ${a.description}` : ''}</div>
      </div>

      {when ? (
        <>
          {[-2, -1, 1, 2].filter(k => d.h + k >= 0 && d.h + k <= 23).map(k => (
            <div key={k} className="tape" style={{ top: tY + nb(k), fontSize: 13, color: INK2, opacity: .8 - Math.abs(k) * .2, right: 56 }}>{hr(d.h + k)}</div>
          ))}
          <div className="tape" style={{ top: tY, right: 56 }}>
            <span className="serif" style={{ fontSize: 42, letterSpacing: '-.01em' }}>{fmtClock(d.h * 60).t.replace(':00', '')}</span><span className="it" style={{ fontSize: 17, color: INK2 }}> {fmtClock(d.h * 60).ap}</span>
          </div>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} aria-hidden="true">
            <path d={`M${w / 2 - 80} ${tY - 32} Q${w / 2 - 34} ${tY - 42} ${w / 2 + 12} ${tY - 32}`} stroke={GOLD} fill="none" />
            <path d={`M${w / 2 - 80} ${tY + 34} Q${w / 2 - 34} ${tY + 44} ${w / 2 + 12} ${tY + 34}`} stroke={GOLD} fill="none" />
            <line x1={rx} x2={rx} y1={rt - 6} y2={rt + rulerH + 6} stroke={INK} strokeWidth=".8" opacity=".25" />
            {Array.from({ length: 24 }, (_, i) => (
              <g key={i}>
                <line x1={rx - (i % 3 === 0 ? 8 : 4)} x2={rx} y1={ry(i)} y2={ry(i)} stroke={INK} strokeWidth=".8" opacity={i % 3 === 0 ? .5 : .28} />
                {i % 3 === 0 && <text x={rx - 12} y={ry(i) + 3} fontSize="9" textAnchor="end" fill={INK2} fontFamily="Inter, sans-serif">{hr(i).replace(' ', '').replace('m', '')}</text>}
              </g>
            ))}
            <circle cx={rx} cy={ry(d.h)} r="6" fill={GOLD} stroke="#fff" strokeWidth="2" />
            {!isWin && <>
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
            </>}
          </svg>
          {!isWin && (
            <div className="node held" style={{ left: Math.max(40, Math.min(w - 96, bx(d.lvl))), top: by(d.lvl) - 50, ['--r' as string]: rim, ['--f' as string]: fill, ['--sz' as string]: '56px', transition: 'left .12s', pointerEvents: 'none', boxShadow: `0 0 0 1.5px ${rim},0 0 0 6px #FBFAF7,0 0 0 7px rgba(200,161,90,.6),0 16px 28px rgba(43,50,71,.2)` }}>
              <i />{art ? <img className="catart" src={art} alt="" style={{ width: 44, height: 44 }} /> : <b>{d.cell.mono}</b>}
            </div>
          )}
          {!isWin && <div style={{ position: 'absolute', left: 0, right: 56, top: bY + 46, textAlign: 'center', pointerEvents: 'none' }}><span className="serif" style={{ fontSize: 21, color: rim }}>{d.lvl}</span><span className="it" style={{ fontSize: 15 }}> · {a?.label ?? ''}</span></div>}
          {isWin && <div style={{ position: 'absolute', left: 0, right: 56, top: bY - 30, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
            <div className="node held" style={{ position: 'relative', left: 'auto', top: 'auto', transform: 'none', ['--r' as string]: rim, ['--f' as string]: fill, ['--sz' as string]: '64px' }}><i />{art ? <img className="catart" src={art} alt="" style={{ width: 50, height: 50 }} /> : <b>{d.cell.mono}</b>}</div>
          </div>}
        </>
      ) : (
        <>
          {[-2, -1, 1, 2].filter(k => d.dur + k >= 1 && d.dur + k <= 12).map(k => (
            <div key={k} className="tape" style={{ top: tY + nb(k), fontSize: 13, color: INK2, opacity: .8 - Math.abs(k) * .2 }}>{k < 0 ? '' : ''}{d.dur + k} h</div>
          ))}
          <div className="tape" style={{ top: tY }}>
            <span className="serif" style={{ fontSize: 46 }}>{d.dur}</span><span className="it" style={{ fontSize: 18, color: INK2 }}> {d.dur === 1 ? 'hour' : 'hours'}</span>
          </div>
          <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} aria-hidden="true">
            <path d={`M${w / 2 - 70} ${tY - 32} Q${w / 2} ${tY - 42} ${w / 2 + 70} ${tY - 32}`} stroke={GOLD} fill="none" />
            <path d={`M${w / 2 - 70} ${tY + 34} Q${w / 2} ${tY + 44} ${w / 2 + 70} ${tY + 34}`} stroke={GOLD} fill="none" />
          </svg>
          <div style={{ position: 'absolute', left: 0, right: 0, top: bY - 8, textAlign: 'center', pointerEvents: 'none' }}>
            <div className="it" style={{ fontSize: 20 }}>{hr(d.h)} <span style={{ color: GOLD }}>→</span> {hr(endH % 24)}{endH >= 24 ? ' (next day)' : ''}</div>
            <div className="caps" style={{ marginTop: 8 }}>{d.cell.name}{isWin ? '' : ` · intensity ${d.lvl}`}</div>
          </div>
        </>
      )}

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 82, textAlign: 'center', fontSize: 11, color: INK2, pointerEvents: 'none' }}>
        {when ? <>drag ↑ later · ↓ earlier{!isWin && <> · ← → intensity</>}</> : <>drag ↑ longer · ↓ shorter</>}
      </div>
      <div style={{ position: 'absolute', left: 20, right: 20, bottom: 14, display: 'flex', gap: 10 }}>
        <button className="chip press" style={{ height: 54, flex: '0 0 30%', fontSize: 15 }} onPointerDown={e => e.stopPropagation()} onClick={when ? onClose : onBack}>{when ? 'Cancel' : '‹ Back'}</button>
        <button className="chip on press" style={{ height: 54, flex: 1, fontSize: 16 }} onPointerDown={e => e.stopPropagation()} onClick={onNext}>
          {when ? (isWin ? (d.editId ? 'Save' : 'Log it') : 'Next · how long →') : finalLabel}
        </button>
      </div>
    </div>
  );
};
