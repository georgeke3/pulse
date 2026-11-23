import { useLayoutEffect, useRef, useState, type PointerEvent as RPE } from 'react';
import type { EventType } from '../types';
import { ActionBar } from './Actions';
import { useStimuli } from './stimuli';
import { Mic } from './Mic';
import { Sheet } from './Sheet';
import { EMBER, GOLD, INK, INK2, SKY } from './skins';
import { haptic } from './haptics';
import { BANDS, bandOf, snap } from './load';

export const STEP_Y = 16;
export const MAX_STEP_X = 34;  // px per intensity level (shrinks near the edges)
export const RIM: Record<EventType, [string, string]> = { training: [EMBER, '#F3C9B4'], recovery: [SKY, '#C9D7E9'], win: [GOLD, '#F1DDAE'] };

export interface Cell { name: string; type: EventType; mono: string; id?: string; art?: string; label?: string }
export interface Draft { cell: Cell; lvl: number; pct: number; note: string; editId?: string; from?: { x: number; y: number }; kx?: number | null }
/** x of intensity bead v (1-10) in a zone w px wide. While dragging, the knob follows the thumb freely (kx) and the level is whichever bead it is nearest. */
export const beadX = (v: number, w: number) => 34 + (v - 1) * ((w - 68) / 9);

export const durLabel = (n: number) => `${n} ${n === 1 ? 'hour' : 'hours'}`;

interface Props {
  d: Draft;
  anchors: { value: number; label: string; description: string }[];
  onDown: (e: RPE<HTMLDivElement>) => void; onMove: (e: RPE<HTMLDivElement>) => void; onUp: () => void;
  onNote: (t: string) => void; onConfirm: () => void; onClose: () => void;
  /** share of the day's capacity (load or recovery), and what the rest of the day already adds up to on that side */
  onPct: (p: number) => void; before: number;
}

const ZH = 160;  // height of the intensity scrubbing zone

/** Load (or recovery) as a share of the day: 5% steps, with the day's running total rising as you scrub. */
const LoadScrub = ({ type, pct, before, rim, onPct }: { type: 'training' | 'recovery'; pct: number; before: number; rim: string; onPct: (p: number) => void }) => {
  const box = useRef<HTMLDivElement>(null), last = useRef(pct);
  last.current = pct;
  const at = (x: number) => {
    const el = box.current; if (!el) return;
    const r = el.getBoundingClientRect(), lo = 34, hi = r.width - 34;
    const p = snap(((x - r.left - lo) / (hi - lo)) * 100);
    if (p !== last.current) { last.current = p; haptic(5); onPct(p); }
  };
  const total = before + pct, scale = Math.max(100, total), word = type === 'recovery' ? 'recovery' : 'load';
  const bands = BANDS[type];
  return (
    <div ref={box} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); at(e.clientX); }} onPointerMove={e => { if (e.buttons || e.pointerType === 'touch') at(e.clientX); }}
      style={{ position: 'relative', flex: 'none', padding: '6px 34px 10px', touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }} aria-label={`${word} ${pct} percent of the day`}>
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span className="caps">{word} · share of the day</span>
        <span><span className="serif" style={{ fontSize: 22, color: rim }}>{pct}%</span></span>
      </div>
      <div className="it" style={{ fontSize: 13.5, color: INK2, marginTop: 1, textAlign: 'right' }}>{bandOf(type, pct).label}</div>
      <div style={{ position: 'relative', height: 34, marginTop: 2 }}>
        <div style={{ position: 'absolute', left: 0, right: 0, top: 15, height: 4, borderRadius: 2, background: 'rgba(43,50,71,.12)' }} />
        <div style={{ position: 'absolute', left: 0, width: `${pct}%`, top: 15, height: 4, borderRadius: 2, background: rim }} />
        {bands.slice(0, -1).map(b => <i key={b.to} style={{ position: 'absolute', left: `${b.to}%`, top: 10, width: 1.2, height: 14, background: 'rgba(43,50,71,.28)' }} />)}
        <span style={{ position: 'absolute', left: `${pct}%`, top: 17, width: 26, height: 26, marginLeft: -13, marginTop: -13, borderRadius: '50%', background: '#fff', boxShadow: `0 0 0 2px ${rim}, 0 4px 10px rgba(43,50,71,.18)` }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 4 }}>
        <span style={{ fontSize: 11.5, color: INK2, flex: 'none' }}>day total</span>
        <div style={{ position: 'relative', flex: 1, height: 8, borderRadius: 4, background: 'rgba(43,50,71,.08)', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${(before / scale) * 100}%`, background: rim, opacity: .35 }} />
          <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${(before / scale) * 100}%`, width: `${(pct / scale) * 100}%`, background: rim, transition: 'width .12s' }} />
          {scale > 100 && <i style={{ position: 'absolute', top: -2, bottom: -2, left: `${(100 / scale) * 100}%`, width: 1.5, background: INK }} />}
        </div>
        <span style={{ flex: 'none', fontSize: 13, color: total > 100 ? INK : INK2, fontWeight: total > 100 ? 600 : 400 }}>{before ? `${before}% → ` : ''}<b className="serif" style={{ color: rim, fontWeight: 600 }}>{total}%</b></span>
      </div>
    </div>
  );
};

/** The logging sheet: scrub the intensity, say or type what happened, confirm. Nothing saves until you press the button. */
export const LogSheet = ({ d, anchors, onDown, onMove, onUp, onNote, onConfirm, onClose, onPct, before }: Props) => {
  const stim = useStimuli();
  const first = useRef({ lvl: d.lvl, pct: d.pct, note: d.note });
  const dirty = d.note.trim() !== first.current.note.trim() || (d.cell.type !== 'win' && (d.lvl !== first.current.lvl || d.pct !== first.current.pct));
  const isWin = d.cell.type === 'win', [rim, fill] = RIM[d.cell.type];
  const a = anchors.find(x => x.value === d.lvl);
  const zone = useRef<HTMLDivElement>(null);
  const [zw, setZw] = useState(345);
  useLayoutEffect(() => {
    const el = zone.current; if (!el) return;
    const f = () => setZw(el.clientWidth); f();
    const ro = new ResizeObserver(f); ro.observe(el); return () => ro.disconnect();
  }, []);
  // Typing happens in a card at the top of the sheet. The keyboard (and iOS's floating accessory bar, which the
  // visual viewport does not report) can never cover it, and the sheet itself never moves.
  const [open, setOpen] = useState(false);
  const ta = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => { const t = ta.current; if (!t) return; t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 150)}px`; }, [d.note, open]);
  const openComposer = () => { ta.current?.focus({ preventScroll: true }); setOpen(true); };
  const bY = 100;
  const bx = (v: number) => beadX(v, zw);
  const by = (v: number) => bY - Math.sin((v - 1) / 9 * Math.PI) * 16;
  const dragging = d.kx != null;
  const kx = d.kx ?? bx(d.lvl);
  const ky = by(Math.max(1, Math.min(10, 1 + (kx - bx(1)) / ((zw - 68) / 9))));
  const art = d.cell.type === 'win' ? stim.art('win', 'Win') : d.cell.art ?? stim.art(d.cell.type, d.cell.name);
  const face = art ? <img className="catart" src={art} alt="" style={{ width: isWin ? 50 : 44, height: isWin ? 50 : 44 }} /> : <b>{d.cell.mono}</b>;
  const add = (t: string) => onNote(d.note.trim() ? `${d.note.trimEnd()} ${t}` : t);

  return (
    <Sheet mode="present" still>
      <div style={{ position: 'relative', flex: 'none', textAlign: 'center', padding: '0 64px' }}>
        <div className="caps" style={{ paddingTop: 4 }}>{d.editId ? 'editing' : 'logging'}</div>
        <div className="serif" style={{ fontSize: 30, marginTop: 4 }}>{d.cell.name}</div>
        <div className="it" style={{ fontSize: 13, color: INK2, marginTop: 3, lineHeight: 1.35, height: 36, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{isWin ? 'A small victory, kept.' : a ? `${a.label}: ${a.description}` : ''}</div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 18 }}>
      <div style={{ display: 'flex' }}>
      <div ref={zone} onPointerDown={isWin ? undefined : onDown} onPointerMove={isWin ? undefined : onMove} onPointerUp={isWin ? undefined : onUp} onPointerCancel={isWin ? undefined : onUp}
        style={{ position: 'relative', flex: 1, height: isWin ? 110 : ZH, touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none' }}>
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
            <div className="node held" style={{ left: kx, top: ky - 50, ['--r' as string]: rim, ['--f' as string]: fill, ['--sz' as string]: '56px', transition: dragging ? 'none' : 'left .22s cubic-bezier(.2,.9,.3,1), top .22s cubic-bezier(.2,.9,.3,1)', pointerEvents: 'none', boxShadow: `0 0 0 1.5px ${rim},0 0 0 6px #FBFAF7,0 0 0 7px rgba(200,161,90,.6),0 16px 28px rgba(43,50,71,.2)` }}><i />{face}</div>
            <div style={{ position: 'absolute', left: 0, right: 0, top: bY + 34, textAlign: 'center', pointerEvents: 'none' }}>
              <span className="caps" style={{ marginRight: 6 }}>intensity · how deep</span><span className="serif" style={{ fontSize: 21, color: rim }}>{d.lvl}</span><span className="it" style={{ fontSize: 15 }}> · {a?.label ?? ''}</span>
            </div>
          </>
        )}
      </div>
      </div>
      {!isWin && <LoadScrub type={d.cell.type === 'recovery' ? 'recovery' : 'training'} pct={d.pct} before={before} rim={rim} onPct={onPct} />}
      </div>

      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px 12px' }}>
        <button type="button" className="press" onClick={openComposer} aria-label="Add details"
          style={{ flex: 1, minWidth: 0, height: 64, display: 'flex', alignItems: 'center', textAlign: 'left', padding: '0 20px', borderRadius: 32, background: 'rgba(255,255,255,.75)', boxShadow: 'inset 0 0 0 1px rgba(43,50,71,.14)' }}>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 15.5, lineHeight: 1.35, color: d.note ? INK : INK2, fontStyle: d.note ? 'normal' : 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.note || 'Add details…'}</span>
        </button>
        <Mic onText={add} size={56} />
      </div>

      <ActionBar keepFocus dirty={dirty} onCancel={onClose} primary={d.editId ? 'Save' : 'Log it'} onPrimary={onConfirm} />
      <div onPointerDown={() => ta.current?.blur()} style={{ position: 'absolute', inset: 0, zIndex: 4, background: 'rgba(251,250,247,.72)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'opacity .2s' }} />
      <div style={{ position: 'absolute', left: 12, right: 12, top: 'calc(var(--top) + 8px)', zIndex: 5, padding: '14px 14px 10px', borderRadius: 24, background: '#fff', boxShadow: '0 0 0 1px rgba(43,50,71,.1), 0 14px 34px rgba(43,50,71,.14)',
        opacity: open ? 1 : 0, transform: open ? 'none' : 'translateY(-10px)', pointerEvents: open ? 'auto' : 'none', transition: 'opacity .18s, transform .22s cubic-bezier(.2,.8,.2,1)' }}>
        <div className="caps" style={{ marginBottom: 6 }}>{d.cell.name} · details</div>
        <textarea ref={ta} rows={1} value={d.note} onChange={e => onNote(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} placeholder="What happened?" aria-label="Details of what happened"
          style={{ display: 'block', width: '100%', boxSizing: 'border-box', minHeight: 48, maxHeight: 150, resize: 'none', border: 0, outline: 'none', padding: '4px 2px', background: 'transparent', fontSize: 17, lineHeight: 1.45, fontFamily: 'Lora, serif', color: INK }} />
        <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 10, marginTop: 6 }}>
          <Mic onText={add} size={44} />
          <button type="button" className="press" onMouseDown={e => e.preventDefault()} onClick={() => ta.current?.blur()}
            style={{ height: 44, padding: '0 20px', borderRadius: 22, background: INK, color: '#fff', fontSize: 15, fontWeight: 600 }}>Done</button>
        </div>
      </div>
    </Sheet>
  );
};
