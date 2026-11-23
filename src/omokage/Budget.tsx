import { useCallback, useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';

/**
 * Tabs in this app don't scroll, so a screen's content has to fit whatever the data and the phone. A Budget is the
 * flexible middle of such a screen: give it slots in priority order and it shows as many as fit the height it has.
 *   - `essential` slots always show, wherever they sit in the list.
 *   - the rest show in the order given, stopping at the first one that doesn't fit (so a lower-priority slot never jumps
 *     ahead of a higher one). Whatever is dropped should be reachable another way.
 *   - only if the essentials alone don't fit (a very small phone) does the region scroll, with no visible scrollbar.
 * Sizes come from a hidden copy of every slot, so showing or hiding one never changes what is measured (no flicker, no loops).
 * Slot content must be plain display (no ids, no internal state), since two copies are rendered.
 */
export interface Slot { key: string; node: ReactNode; essential?: boolean }

const same = (a: number[] | null, b: number[]) => !!a && a.length === b.length && a.every((v, i) => v === b[i]);

/** `end` sits the shown slots at the bottom of the region (margin, not justify-content, so an overflowing region still scrolls from its top) */
export const Budget = ({ slots, className = 'grow', style, end }: { slots: Slot[]; className?: string; style?: CSSProperties; end?: boolean }) => {
  const outer = useRef<HTMLDivElement>(null), ghost = useRef<HTMLDivElement>(null);
  const [h, setH] = useState<number[] | null>(null), [avail, setAvail] = useState(0);
  const live = slots.filter(s => !!s.node);

  const measure = useCallback(() => {
    const g = ghost.current, o = outer.current; if (!g || !o) return;
    const hs = Array.from(g.children).map(c => Math.ceil((c as HTMLElement).getBoundingClientRect().height));
    setH(p => (same(p, hs) ? p : hs)); setAvail(a => (a === o.clientHeight ? a : o.clientHeight));
  }, []);
  useLayoutEffect(() => { measure(); });                                     // after every render; the guards above stop it looping
  useEffect(() => {
    const ro = new ResizeObserver(measure);
    if (outer.current) ro.observe(outer.current);
    if (ghost.current) ro.observe(ghost.current);
    void document.fonts?.ready.then(measure);                                // fonts arriving late change every height
    return () => ro.disconnect();
  }, [measure]);

  const show = new Set<string>();
  let used = 0;
  live.forEach((s, i) => { if (s.essential) { show.add(s.key); used += h?.[i] ?? 0; } });
  let open = h != null;
  live.forEach((s, i) => { if (s.essential || !open) return; const need = h?.[i] ?? 0; if (used + need <= avail) { used += need; show.add(s.key); } else open = false; });

  return (
    <div ref={outer} className={className} style={{ position: 'relative', minHeight: 0, overflowY: used > avail ? 'auto' : 'hidden', scrollbarWidth: 'none', display: 'flex', flexDirection: 'column', ...style }}>
      {live.filter(s => show.has(s.key)).map((s, i) => <div key={s.key} style={{ display: 'flow-root', flex: 'none', marginTop: end && i === 0 ? 'auto' : undefined }}>{s.node}</div>)}
      <div aria-hidden="true" inert style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 0, overflow: 'hidden', visibility: 'hidden', pointerEvents: 'none' }}>
        <div ref={ghost}>{live.map(s => <div key={s.key} style={{ display: 'flow-root' }}>{s.node}</div>)}</div>
      </div>
    </div>
  );
};
