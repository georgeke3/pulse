/** A wisp: a fat, tapering ribbon that streams from a circle toward the centre and bends a little as it goes (all the same way, so the day swirls).
 *  Length is the share of the day, width swells with it, colour is the intensity. Returns the outline and its centre line. */
export const wisp = (x: number, y: number, ux: number, uy: number, len: number, W: number, curl: number) => {
  const px = -uy, py = ux, N = 18, L: string[] = [], R: string[] = [], C: string[] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const off = curl * len * 0.2 * Math.sin(t * Math.PI * 0.95) * t;                       // drifts sideways, most near the tip
    const cx = x + ux * len * t + px * off, cy = y + uy * len * t + py * off;
    const hw = W * Math.pow(1 - t, 0.8) * (0.82 + 0.18 * Math.sin(t * Math.PI * 0.9));    // full at the circle, swelling slightly, thinning to a point
    L.push(`${(cx + px * hw).toFixed(1)} ${(cy + py * hw).toFixed(1)}`);
    R.push(`${(cx - px * hw).toFixed(1)} ${(cy - py * hw).toFixed(1)}`);
    if (t >= 0.1 && t <= 0.72) C.push(`${cx.toFixed(1)} ${cy.toFixed(1)}`);
  }
  return { d: `M${L.join('L')}L${R.reverse().join('L')}Z`, vein: `M${C.join('L')}` };
};
