// Where the circles sit on the Present tab. A pure function of (area, how many load circles, how many rest circles).
//
// Stability rules (so muscle memory holds):
//  - Gratitude, Win and Sleep sit in a row above the ring. Load circles own the left half, rest circles the right half, so adding one kind never moves the other.
//  - Within a half, circle i takes slot i (its order among the shown ones). Appending a circle only spreads the half a little:
//    re-divides, and then nobody moves by more than one slot (the ones nearest the top barely move at all).
//  - Past the outer ring's capacity circles spill onto an inner ring; the outer ring is then full and stays fixed.
export interface Pt { x: number; y: number; a: number; inner?: boolean }   // a = ellipse angle, used to place labels outward
export interface Layout {
  win: Pt; gratitude: Pt; sleep: Pt; load: Pt[]; rest: Pt[];
  sz: number; spacing: number; labels: boolean; crest: number;
  cx: number; cy: number; rx: number; ry: number; inner: { rx: number; ry: number } | null;
}

const MIN_SPACING = 40, INNER = 0.62, S = 480;
export const tier = (n: number) => Math.max(6, n);

interface Half { len: number; at: (frac: number) => Pt }
const half = (cx: number, cy: number, rx: number, ry: number, side: 1 | -1): Half => {
  const P: Pt[] = [], L = [0];
  for (let i = 0; i <= S; i++) { const a = -Math.PI / 2 + Math.PI * i / S; P.push({ x: cx + side * rx * Math.cos(a), y: cy + ry * Math.sin(a), a: side === 1 ? a : Math.PI - a }); }
  for (let i = 1; i <= S; i++) L.push(L[i - 1] + Math.hypot(P[i].x - P[i - 1].x, P[i].y - P[i - 1].y));
  const len = L[S];
  return { len, at: f => {
    const t = Math.max(0, Math.min(1, f)) * len; let lo = 0, hi = S;
    while (lo < hi - 1) { const m = (lo + hi) >> 1; if (L[m] <= t) lo = m; else hi = m; }
    const k = L[hi] === L[lo] ? 0 : (t - L[lo]) / (L[hi] - L[lo]);
    return { x: P[lo].x + (P[hi].x - P[lo].x) * k, y: P[lo].y + (P[hi].y - P[lo].y) * k, a: P[lo].a + (P[hi].a - P[lo].a) * k };
  } };
};

export function layout(w: number, h: number, nLoad: number, nRest: number): Layout {
  const cx = w / 2, cy = h / 2;
  const rx = Math.max(90, Math.min(128, w / 2 - 70));
  const ry = Math.max(100, Math.min(rx * 1.3, h / 2 - 98));      // a little taller than wide: more room for circles and for wisps, with the special row above
  const out = { l: half(cx, cy, rx, ry, -1), r: half(cx, cy, rx, ry, 1) };
  const capMax = Math.max(6, Math.floor(out.r.len / MIN_SPACING - 0.5));
  const n0L = Math.min(nLoad, capMax), n0R = Math.min(nRest, capMax);
  // each half has its own capacity, so adding a load circle can never move a rest circle (and vice versa)
  const H0L = Math.min(capMax, tier(n0L)), H0R = Math.min(capMax, tier(n0R));
  const spL = out.l.len / (H0L + 0.5), spR = out.r.len / (H0R + 0.5), spacing = Math.min(spL, spR);
  const sz = Math.max(30, Math.min(44, Math.round(spacing * 0.86)));
  const n1L = nLoad - n0L, n1R = nRest - n0R, used1 = n1L + n1R > 0;

  const rx1 = rx * INNER, ry1 = ry * INNER;
  const inn = used1 ? { l: half(cx, cy, rx1, ry1, -1), r: half(cx, cy, rx1, ry1, 1) } : null;
  // Inner ring circles sit between the outer circles' radial lines (a brick pattern), every other gap first, so no circle blocks
  // another's wisp and nobody moves when one is added. Each half keeps its own order.
  const gaps = (H0: number) => { const m = Math.max(1, H0 - 1), e: number[] = [], o: number[] = []; for (let g = 0; g < m; g++) (g % 2 ? o : e).push(g); return [...e, ...o]; };
  const slots = (n: number, n0: number, H0: number, side: 'l' | 'r'): Pt[] => {
    const order = gaps(H0);
    return Array.from({ length: n }, (_, i) => (i < n0 || !inn ? out[side].at((i + 1) / (H0 + 0.5)) : { ...inn[side].at((order[(i - n0) % order.length] + 1.5) / (H0 + 0.5)), inner: true }));
  };

  let crest = Math.min(120, 2 * Math.min(rx, ry) - 96);
  if (used1) crest = Math.max(96, Math.min(crest, 2 * rx1 - sz * 0.92 - 34));
  return {
    // the three special circles crown the ring in a row: gratitude, win, sleep
    gratitude: { x: cx - 64, y: cy - ry - 58, a: -Math.PI / 2 }, win: { x: cx, y: cy - ry - 62, a: -Math.PI / 2 }, sleep: { x: cx + 64, y: cy - ry - 58, a: -Math.PI / 2 },
    load: slots(nLoad, n0L, H0L, 'l'), rest: slots(nRest, n0R, H0R, 'r'),
    sz, spacing, labels: true, crest, cx, cy, rx, ry, inner: used1 ? { rx: rx1, ry: ry1 } : null,
  };
}
