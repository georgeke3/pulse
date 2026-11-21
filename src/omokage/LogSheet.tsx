import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as RPE } from 'react';
import type { EventType } from '../types';
import { catArt } from './catArt';
import { Mic } from './Mic';
import { Sheet } from './Sheet';
import { EMBER, GOLD, INK, INK2, SKY } from './skins';

export const STEP_Y = 16;
export const MAX_STEP_X = 34;  // px per intensity level (shrinks near the edges)
export const RIM: Record<EventType, [string, string]> = { training: [EMBER, '#F3C9B4'], recovery: [SKY, '#C9D7E9'], win: [GOLD, '#F1DDAE'] };

export interface Cell { name: string; type: EventType; mono: string }
export interface Draft { cell: Cell; lvl: number; note: string; editId?: string; from?: { x: number; y: number }; kx?: number | null }
/** x of intensity bead v (1-10) in a zone w px wide. While dragging, the knob follows the thumb freely (kx) and the level is whichever bead it is nearest. */
export const beadX = (v: number, w: number) => 34 + (v - 1) * ((w - 68) / 9);

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
  // typing happens in a bar that floats above the keyboard; the sheet itself never resizes or scrolls
  const [open, setOpen] = useState(false), [kb, setKb] = useState(0);
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const v = window.visualViewport; if (!v) return;
    const f = () => { setKb(Math.max(0, Math.round(document.documentElement.clientHeight - v.height - v.offsetTop))); if (window.scrollY) window.scrollTo(0, 0); };
    v.addEventListener('resize', f); v.addEventListener('scroll', f); return () => { v.removeEventListener('resize', f); v.removeEventListener('scroll', f); };
  }, []);
  useLayoutEffect(() => { const t = ta.current; if (!t) return; t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight, 112)}px`; }, [d.note, open]);
  const openComposer = () => { ta.current?.focus({ preventScroll: true }); setOpen(true); };
  const bY = 120;
  const bx = (v: number) => beadX(v, zw);
  const by = (v: number) => bY - Math.sin((v - 1) / 9 * Math.PI) * 16;
  const dragging = d.kx != null;
  const kx = d.kx ?? bx(d.lvl);
  const ky = by(Math.max(1, Math.min(10, 1 + (kx - bx(1)) / ((zw - 68) / 9))));
  const art = catArt(d.cell.type, d.cell.name);
  const face = art ? <img className="catart" src={art} alt="" style={{ width: isWin ? 50 : 44, height: isWin ? 50 : 44 }} /> : <b>{d.cell.mono}</b>;
  const add = (t: string) => onNote(d.note.trim() ? `${d.note.trimEnd()} ${t}` : t);

  return (
    <Sheet mode="present" still>
      <div style={{ position: 'relative', flex: 'none', textAlign: 'center', padding: '0 64px' }}>
        <button className="ls-x press" aria-label="Close" onClick={onClose}>
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3 3 L13 13 M13 3 L3 13" stroke={INK} strokeWidth="1.6" strokeLinecap="round" /></svg>
        </button>
        <div className="caps" style={{ paddingTop: 4 }}>{d.editId ? 'editing' : 'logging'}</div>
        <div className="serif" style={{ fontSize: 30, marginTop: 4 }}>{d.cell.name}</div>
        <div className="it" style={{ fontSize: 13, color: INK2, marginTop: 3, lineHeight: 1.35, height: 36, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{isWin ? 'A small victory, kept.' : a ? `${a.label}: ${a.description}` : ''}</div>
      </div>

      <div style={{ flex: 1, minHeight: 0, display: 'flex', alignItems: 'center' }}>
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
            <div style={{ position: 'absolute', left: 0, right: 0, top: bY + 44, textAlign: 'center', pointerEvents: 'none' }}>
              <span className="serif" style={{ fontSize: 21, color: rim }}>{d.lvl}</span><span className="it" style={{ fontSize: 15 }}> · {a?.label ?? ''}</span>
              <div style={{ fontSize: 11, color: INK2, marginTop: 2 }}>drag ← → anywhere here</div>
            </div>
          </>
        )}
      </div>
      </div>

      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 10, padding: '0 20px 12px' }}>
        <button type="button" className="press" onClick={openComposer} aria-label="Add details"
          style={{ flex: 1, minWidth: 0, height: 64, display: 'flex', alignItems: 'center', textAlign: 'left', padding: '0 20px', borderRadius: 32, background: 'rgba(255,255,255,.75)', boxShadow: 'inset 0 0 0 1px rgba(43,50,71,.14)' }}>
          <span style={{ fontFamily: 'Lora, serif', fontSize: 15.5, lineHeight: 1.35, color: d.note ? INK : INK2, fontStyle: d.note ? 'normal' : 'italic', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{d.note || 'Add details…'}</span>
        </button>
        <Mic onText={add} size={56} />
      </div>

      <div style={{ flex: 'none', display: 'flex', gap: 10, padding: '0 20px calc(12px + var(--sb))' }}>
        <button className="chip press" style={{ height: 54, flex: '0 0 30%', fontSize: 15 }} onMouseDown={e => e.preventDefault()} onClick={onClose}>Cancel</button>
        <button className="chip on press" style={{ height: 54, flex: 1, fontSize: 16 }} onMouseDown={e => e.preventDefault()} onClick={onConfirm}>{d.editId ? 'Save' : 'Log it'}</button>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: open ? (kb || 300) : 0, zIndex: 5, display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 12px', background: 'rgba(255,255,255,.98)', borderRadius: '20px 20px 0 0', boxShadow: '0 -1px 0 rgba(43,50,71,.1), 0 -12px 30px rgba(43,50,71,.08)',
        transform: open ? 'none' : 'translateY(130%)', opacity: open ? 1 : 0, pointerEvents: open ? 'auto' : 'none', transition: 'bottom .24s var(--ease), transform .24s var(--ease), opacity .16s' }}>
        <textarea ref={ta} rows={1} value={d.note} onChange={e => onNote(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setOpen(false)} placeholder="What happened?" aria-label="Details of what happened"
          style={{ flex: 1, minWidth: 0, minHeight: 44, maxHeight: 112, padding: '10px 14px', borderRadius: 22, background: '#F6F4EF', fontSize: 17, lineHeight: 1.4, fontFamily: 'Lora, serif' }} />
        <Mic onText={add} size={44} />
        <button type="button" className="press" aria-label="Done typing" onMouseDown={e => e.preventDefault()} onClick={() => ta.current?.blur()}
          style={{ width: 44, height: 44, borderRadius: 22, flex: 'none', display: 'grid', placeItems: 'center', background: INK, color: '#fff' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M3.5 9.5 7.5 13.5 14.5 5" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
      </div>
    </Sheet>
  );
};
