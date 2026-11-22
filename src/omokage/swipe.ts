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
