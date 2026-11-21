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
