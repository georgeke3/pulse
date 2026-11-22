import { useRef } from 'react';

/** Horizontal swipe on an element: fires once per gesture when the finger travels far enough sideways (and mostly sideways). */
export const useSwipe = (onLeft: () => void, onRight: () => void, min = 48) => {
  const g = useRef<{ x: number; y: number; id: number } | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => { g.current = { x: e.clientX, y: e.clientY, id: e.pointerId }; },
    onPointerUp: (e: React.PointerEvent) => {
      const s = g.current; g.current = null;
      if (!s || s.id !== e.pointerId) return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (Math.abs(dx) < min || Math.abs(dx) < Math.abs(dy) * 1.4) return;
      if (dx < 0) onLeft(); else onRight();
    },
    onPointerCancel: () => { g.current = null; },
    style: { touchAction: 'pan-y' } as React.CSSProperties,
  };
};

/** Back-swipe for nested screens: start within the left edge and travel right. Spread the result on the screen's root. */
export const useBackSwipe = (onBack: () => void) => {
  const g = useRef<{ x: number; y: number; id: number } | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => { const r = e.currentTarget.getBoundingClientRect(); g.current = e.clientX - r.left < 36 ? { x: e.clientX, y: e.clientY, id: e.pointerId } : null; },
    onPointerUp: (e: React.PointerEvent) => {
      const s = g.current; g.current = null;
      if (!s || s.id !== e.pointerId) return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (dx > 64 && dx > Math.abs(dy) * 1.5) onBack();
    },
    onPointerCancel: () => { g.current = null; },
  };
};

/** Hidden gesture: put a finger down and draw circles (either direction). Fires once after about `loops` turns.
 *  It sums the signed turning of the path, so it needs no centre point and a straight swipe never counts. */
export const useCircle = (onDone: () => void, onLoop?: () => void, loops = 3) => {
  const g = useRef<{ id: number; px: number; py: number; vx: number; vy: number; turn: number; n: number; done: boolean } | null>(null);
  return {
    onPointerDown: (e: React.PointerEvent) => { e.currentTarget.setPointerCapture(e.pointerId); g.current = { id: e.pointerId, px: e.clientX, py: e.clientY, vx: 0, vy: 0, turn: 0, n: 0, done: false }; },
    onPointerMove: (e: React.PointerEvent) => {
      const s = g.current; if (!s || s.id !== e.pointerId || s.done) return;
      const dx = e.clientX - s.px, dy = e.clientY - s.py;
      if (Math.hypot(dx, dy) < 7) return;
      if (s.vx || s.vy) {
        let a = Math.atan2(s.vx * dy - s.vy * dx, s.vx * dx + s.vy * dy);
        if (Math.abs(a) > 1.9) a = 0;                       // a sharp doubling-back is a jitter, not a curve
        s.turn += a;
        const n = Math.floor(Math.abs(s.turn) / (2 * Math.PI * .92));
        if (n > s.n) { s.n = n; onLoop?.(); }
        if (n >= loops) { s.done = true; onDone(); }
      }
      s.vx = dx; s.vy = dy; s.px = e.clientX; s.py = e.clientY;
    },
    onPointerUp: () => { g.current = null; },
    onPointerCancel: () => { g.current = null; },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
    style: { touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none' } as React.CSSProperties,
  };
};
