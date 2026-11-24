/** A wisp: smoke / flame / a streaming ribbon of ink that leaves a circle toward the centre.
 *  No two are alike: each id seeds its own S-curve, swelling and pinching, ragged edge, flicked tip, a few loose filaments and drifting motes.
 *  Length is the share of the day, width swells with it, colour is the intensity (drawn by the caller). */
export interface Wisp { d: string; vein: string; strands: { d: string; o: number; delay: number; dur: number; rot: number }[]; motes: { x: number; y: number; r: number; o: number; delay: number }[]; tail: string }

/** Small deterministic generator, so a wisp keeps its character between renders and devices. */
const rng = (seed: number) => { let s = (seed >>> 0) || 1; return () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; }; };
export const seedOf = (id: string) => { let h = 2166136261; for (let i = 0; i < id.length; i++) { h ^= id.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };
const ss = (a: number, b: number, x: number) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

export const wisp = (x: number, y: number, ux: number, uy: number, len: number, W: number, seed: number): Wisp => {
  const r = rng(seed), px = -uy, py = ux;
  const rr = (a: number, b: number) => a + (b - a) * r();
  // mostly the same way round so the day swirls, but not always
  const dir = r() < .78 ? 1 : -1;
  const a1 = dir * rr(.1, .3), a2 = rr(-.07, .07), ph = rr(0, 6.28), flick = dir * rr(-.12, .2), pw = rr(.72, 1.15), bulge = rr(.15, .45), bt = rr(.18, .42);
  const f1 = rr(5, 9), f2 = rr(11, 17), e1 = rr(.05, .16), e2 = rr(.03, .09), ph1 = rr(0, 6.28), ph2 = rr(0, 6.28), ph3 = rr(0, 6.28), ph4 = rr(0, 6.28);
  const length = len * rr(.92, 1.06);

  const off = (t: number) => length * (a1 * Math.sin(t * Math.PI * .95) * t * .8 + a2 * Math.sin(t * 6.28 + ph) * t * t + flick * Math.pow(Math.max(0, t - .72), 2) * 2.2);
  const at = (t: number, o = 0) => { const k = off(t) + o; return [x + ux * length * t + px * k, y + uy * length * t + py * k] as const; };
  // fat at the circle, a swelling belly, a long thinning tip; each edge has its own ragged breathing
  const prof = (t: number) => Math.pow(Math.max(0, 1 - Math.pow(t, 1.25)), pw) * (1 + bulge * Math.exp(-Math.pow((t - bt) / .16, 2)));
  const edge = (t: number, a: number, b: number) => 1 + e1 * Math.sin(t * f1 + a) + e2 * Math.sin(t * f2 + b);

  const N = 30, L: string[] = [], R: string[] = [], C: string[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N, [cx, cy] = at(t), hw = W * prof(t);
    const hl = hw * edge(t, ph1, ph2), hr = hw * edge(t, ph3, ph4);
    L.push(`${(cx + px * hl).toFixed(1)} ${(cy + py * hl).toFixed(1)}`);
    R.push(`${(cx - px * hr).toFixed(1)} ${(cy - py * hr).toFixed(1)}`);
    if (t >= .08 && t <= .7) C.push(`${cx.toFixed(1)} ${cy.toFixed(1)}`);
  }
  const d = `M${L.join('L')}L${R.reverse().join('L')}Z`;

  // loose filaments: thin ribbons that peel away from the body and drift off on their own curve
  const strands: Wisp['strands'] = [], ns = 1 + Math.floor(r() * 3);
  for (let s = 0; s < ns; s++) {
    const side = r() < .5 ? -1 : 1, t0 = rr(0, .22), span = rr(.45, .95), lat = side * rr(.35, .95) * W, spread = side * rr(.05, .2) * length, wob = rr(0, 6.28), sw = W * rr(.1, .2);
    const A: string[] = [], B: string[] = [], M = 18;
    for (let i = 0; i <= M; i++) {
      const u = i / M, t = t0 + (1 - t0) * span * u;
      const [cx, cy] = at(t, lat * (1 - u * .4) + spread * u * u + Math.sin(u * 5 + wob) * W * .12);
      const h = sw * Math.pow(1 - u, .9) * (.6 + .4 * ss(0, .25, u));
      A.push(`${(cx + px * h).toFixed(1)} ${(cy + py * h).toFixed(1)}`); B.push(`${(cx - px * h).toFixed(1)} ${(cy - py * h).toFixed(1)}`);
    }
    strands.push({ d: `M${A.join('L')}L${B.reverse().join('L')}Z`, o: rr(.4, .7), delay: -rr(0, 6), dur: rr(3.6, 6.4), rot: side * rr(1.2, 3.4) });
  }

  // a hairline tail beyond the tip, curling off
  const [tx, ty] = at(1), tl = length * rr(.1, .22), curl = dir * rr(.5, 1.1), TT: string[] = [];
  for (let i = 0; i <= 10; i++) { const u = i / 10, ang = curl * u * u; TT.push(`${(tx + ux * tl * u + px * tl * Math.sin(ang) * .9).toFixed(1)} ${(ty + uy * tl * u + py * tl * Math.sin(ang) * .9).toFixed(1)}`); }

  // motes shaken loose: a few specks drifting past the tip
  const motes: Wisp['motes'] = Array.from({ length: 2 + Math.floor(r() * 3) }, (_, i) => {
    const u = rr(.02, .22) + i * .03, side = r() < .5 ? -1 : 1;
    return { x: tx + ux * length * u + px * side * rr(3, 13), y: ty + uy * length * u + py * side * rr(3, 13), r: rr(.7, 1.9), o: rr(.25, .6) * (1 - i * .15), delay: -rr(0, 4) };
  });
  return { d, vein: `M${C.join('L')}`, strands, motes, tail: `M${TT.join('L')}` };
};
