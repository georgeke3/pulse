import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { haptic } from './haptics';
import { useImg, type ImgRef } from './images';
import { ago } from './skins';

export interface Shot { ref: ImgRef; text: string; day: string }

const MAX = 5;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

const Slide = ({ s, live, zoomRef }: { s: Shot; live: boolean; zoomRef: React.RefObject<HTMLDivElement | null> }) => {
  const thumb = useImg(s.ref.id, 'thumb'), full = useImg(live ? s.ref.id : undefined, 'full');
  const src = full ?? thumb;
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
      <div ref={live ? zoomRef : undefined} style={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', willChange: 'transform', transformOrigin: '50% 50%' }}>
        {src && <img src={src} alt="" draggable={false} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'default', filter: full ? 'none' : 'blur(2px)' }} />}
      </div>
    </div>
  );
};

/** Full-screen photo viewer: swipe between photos, pinch or double-tap to zoom, drag to pan, swipe down to close. */
export const Viewer = ({ shots, start, onClose }: { shots: Shot[]; start: number; onClose: () => void }) => {
  const [idx, setIdx] = useState(clamp(start, 0, shots.length - 1));
  const box = useRef<HTMLDivElement>(null), track = useRef<HTMLDivElement>(null), zoomEl = useRef<HTMLDivElement>(null), bg = useRef<HTMLDivElement>(null);
  const z = useRef({ s: 1, x: 0, y: 0 });                 // zoom of the current photo
  const idxR = useRef(idx); idxR.current = idx;
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const g = useRef<{ mode: 'none' | 'swipe' | 'down' | 'pan' | 'pinch'; x0: number; y0: number; t0: number; zx: number; zy: number; d0: number; s0: number; mx: number; my: number; moved: boolean }>(
    { mode: 'none', x0: 0, y0: 0, t0: 0, zx: 0, zy: 0, d0: 1, s0: 1, mx: 0, my: 0, moved: false });
  const lastTap = useRef({ t: 0, x: 0, y: 0 });

  const W = () => box.current?.clientWidth ?? 393, H = () => box.current?.clientHeight ?? 700;
  const applyZoom = (anim = false) => {
    const e = zoomEl.current; if (!e) return;
    e.style.transition = anim ? 'transform .22s cubic-bezier(.2,.8,.2,1)' : 'none';
    e.style.transform = `translate(${z.current.x}px,${z.current.y}px) scale(${z.current.s})`;
  };
  const place = (dx = 0, dy = 0, anim = false) => {
    const t = track.current; if (!t) return;
    t.style.transition = anim ? 'transform .28s cubic-bezier(.2,.8,.2,1)' : 'none';
    t.style.transform = `translate(${-idxR.current * W() + dx}px,${dy}px)`;
    if (bg.current) bg.current.style.opacity = String(1 - Math.min(.55, Math.abs(dy) / 500));
  };
  useEffect(() => { z.current = { s: 1, x: 0, y: 0 }; applyZoom(); place(0, 0, true); }, [idx]);   // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { place(); const f = () => place(); window.addEventListener('resize', f); return () => window.removeEventListener('resize', f); }, []);   // eslint-disable-line react-hooks/exhaustive-deps

  /** Keep a zoomed photo's edges from leaving the screen (using the photo's own proportions). */
  const bound = () => {
    const r = shots[idxR.current].ref, w = W(), h = H(), fit = Math.min(w / r.w, h / r.h), dw = r.w * fit * z.current.s, dh = r.h * fit * z.current.s;
    const mx = Math.max(0, (dw - w) / 2), my = Math.max(0, (dh - h) / 2);
    z.current.x = clamp(z.current.x, -mx, mx); z.current.y = clamp(z.current.y, -my, my);
  };
  const go = (n: number) => { const i = clamp(n, 0, shots.length - 1); if (i !== idxR.current) haptic(6); idxR.current = i; setIdx(i); place(0, 0, true); };
  const zoomAt = (px: number, py: number, to: number) => {
    const b = box.current!.getBoundingClientRect(), cx = px - b.left - b.width / 2, cy = py - b.top - b.height / 2, s0 = z.current.s;
    z.current.x = cx - (cx - z.current.x) * (to / s0); z.current.y = cy - (cy - z.current.y) * (to / s0); z.current.s = to; bound(); applyZoom(true);
  };

  const down = (e: React.PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const k = g.current;
    if (pts.current.size === 2) {
      const [a, b] = [...pts.current.values()];
      k.mode = 'pinch'; k.d0 = Math.hypot(a.x - b.x, a.y - b.y) || 1; k.s0 = z.current.s; k.mx = (a.x + b.x) / 2; k.my = (a.y + b.y) / 2; k.zx = z.current.x; k.zy = z.current.y; k.moved = true;
    } else { Object.assign(k, { mode: 'none', x0: e.clientX, y0: e.clientY, t0: Date.now(), zx: z.current.x, zy: z.current.y, moved: false }); }
  };
  const move = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const k = g.current, b = box.current!.getBoundingClientRect();
    if (k.mode === 'pinch' && pts.current.size >= 2) {
      const [p, q] = [...pts.current.values()], d = Math.hypot(p.x - q.x, p.y - q.y), mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
      const s = clamp(k.s0 * d / k.d0, .8, MAX), cx0 = k.mx - b.left - b.width / 2, cy0 = k.my - b.top - b.height / 2;
      z.current.s = s; z.current.x = mx - b.left - b.width / 2 - (cx0 - k.zx) * (s / k.s0); z.current.y = my - b.top - b.height / 2 - (cy0 - k.zy) * (s / k.s0);
      applyZoom(); return;
    }
    const dx = e.clientX - k.x0, dy = e.clientY - k.y0;
    if (!k.moved && Math.hypot(dx, dy) > 8) {
      k.moved = true;
      k.mode = z.current.s > 1.02 ? 'pan' : Math.abs(dx) > Math.abs(dy) ? 'swipe' : 'down';
    }
    if (k.mode === 'pan') { z.current.x = k.zx + dx; z.current.y = k.zy + dy; bound(); applyZoom(); }
    else if (k.mode === 'swipe') { const edge = (idxR.current === 0 && dx > 0) || (idxR.current === shots.length - 1 && dx < 0); place(edge ? dx / 3 : dx); }
    else if (k.mode === 'down') place(0, Math.max(0, dy));
  };
  const up = (e: React.PointerEvent) => {
    const k = g.current; pts.current.delete(e.pointerId);
    if (k.mode === 'pinch') { if (pts.current.size < 2) { if (z.current.s < 1.05) { z.current = { s: 1, x: 0, y: 0 }; applyZoom(true); } else { bound(); applyZoom(true); } k.mode = 'none'; k.moved = true; const left = [...pts.current.values()][0]; if (left) Object.assign(k, { x0: left.x, y0: left.y, zx: z.current.x, zy: z.current.y }); } return; }
    const dx = e.clientX - k.x0, dy = e.clientY - k.y0, dt = Date.now() - k.t0;
    if (k.mode === 'swipe') { if (Math.abs(dx) > W() * .22 || (Math.abs(dx) > 40 && dt < 260)) go(idxR.current + (dx < 0 ? 1 : -1)); else place(0, 0, true); }
    else if (k.mode === 'down') { if (dy > 110) onClose(); else place(0, 0, true); }
    else if (k.mode === 'pan') { /* stays where it was dropped */ }
    else if (!k.moved && dt < 350) {
      const n = lastTap.current, now = Date.now();
      if (now - n.t < 320 && Math.hypot(e.clientX - n.x, e.clientY - n.y) < 30) { lastTap.current = { t: 0, x: 0, y: 0 }; haptic(8); if (z.current.s > 1.05) { z.current = { s: 1, x: 0, y: 0 }; applyZoom(true); } else zoomAt(e.clientX, e.clientY, 2.6); }
      else lastTap.current = { t: now, x: e.clientX, y: e.clientY };
    }
    k.mode = 'none';
  };
  const wheel = (e: React.WheelEvent) => { if (e.ctrlKey || e.metaKey) { zoomAt(e.clientX, e.clientY, clamp(z.current.s * Math.exp(-e.deltaY / 200), 1, MAX)); } else if (Math.abs(e.deltaX) > 30) go(idxR.current + (e.deltaX > 0 ? 1 : -1)); };

  useEffect(() => {
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); else if (e.key === 'ArrowRight') go(idxR.current + 1); else if (e.key === 'ArrowLeft') go(idxR.current - 1); };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  });   // eslint-disable-line react-hooks/exhaustive-deps

  const cur = shots[idx];
  return createPortal(
    <div className="omk omk-viewer" data-mode="future" role="dialog" aria-label="Photo viewer">
      <div ref={bg} style={{ position: 'absolute', inset: 0, background: '#0E1118' }} />
      <div ref={box} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onWheel={wheel} style={{ position: 'absolute', inset: 0, touchAction: 'none', overflow: 'hidden' }}>
        <div ref={track} style={{ position: 'absolute', inset: 0, width: `${shots.length * 100}%`, willChange: 'transform' }}>
          {shots.map((s, i) => Math.abs(i - idx) <= 1 && (
            <div key={s.ref.id} style={{ position: 'absolute', top: 0, bottom: 0, left: `${i * (100 / shots.length)}%`, width: `${100 / shots.length}%` }}>
              <Slide s={s} live={i === idx} zoomRef={zoomEl} />
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, padding: 'calc(var(--top, 0px) + 10px) 20px 0', display: 'flex', justifyContent: 'center', pointerEvents: 'none', color: 'rgba(255,255,255,.78)', fontSize: 13, letterSpacing: '.08em' }}>
        {idx + 1} / {shots.length}
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: '40px 20px calc(12px + var(--bot, 0px))', display: 'flex', flexDirection: 'column', gap: 12, background: 'linear-gradient(transparent, rgba(14,17,24,.82))', pointerEvents: 'none' }}>
        {(cur.text || cur.day) && <div style={{ color: 'rgba(255,255,255,.9)', fontFamily: 'Lora, serif', fontStyle: 'italic', fontSize: 15, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{cur.text || `saved ${ago(cur.day)}`}</div>}
        <div style={{ display: 'flex', pointerEvents: 'auto' }}>
          <button className="chip press" onClick={onClose} style={{ height: 54, flex: '0 0 30%', fontSize: 15, background: 'rgba(255,255,255,.14)', color: '#fff', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,.3)' }}>Close</button>
        </div>
      </div>
    </div>,
    document.body,
  );
};
