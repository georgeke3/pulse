// What the three special circles give off, drawn behind them on the Present ring.
//   Gratitude: a soft bloom for every entry drifting up and out, and a pink glow that deepens with the count.
//   Win:       a gold spark for every win glinting outward, with faint rays behind.
//   Sleep:     a dusk-blue halo whose size is the reserve you banked (load %), with one twinkling star per point of quality.
import { seedOf } from './wisp';

const rnd = (seed: number) => { let s = seed || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
const STAR = 'M0 -1 C.18 -.28 .28 -.18 1 0 C.28 .18 .18 .28 0 1 C-.18 .28 -.28 .18 -1 0 C-.28 -.18 -.18 -.28 0 -1Z';

/** A single drifting element: positioned by the outer transform, animated by the inner group (see .arise in the css). */
const Float = ({ x, y, dx, dy, s, dur, delay, children }: { x: number; y: number; dx: number; dy: number; s: number; dur: number; delay: number; children: React.ReactNode }) => (
  <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)})`}>
    <g className="arise" style={{ ['--dx' as string]: `${dx.toFixed(1)}px`, ['--dy' as string]: `${dy.toFixed(1)}px`, ['--s' as string]: s, animationDuration: `${dur}s`, animationDelay: `${delay}s` }}>{children}</g>
  </g>
);

const Bloom = ({ r, c }: { r: number; c: string }) => (
  <g>
    {[0, 1, 2, 3, 4].map(i => <ellipse key={i} cx="0" cy={-r * .62} rx={r * .42} ry={r * .62} fill={c} opacity=".8" transform={`rotate(${i * 72})`} />)}
    <circle r={r * .26} fill="#FFF3D6" />
  </g>
);

export const Aura = ({ kind, x, y, r, n = 0, q = 0, pct = 0 }: { kind: 'gratitude' | 'win' | 'sleep'; x: number; y: number; r: number; n?: number; q?: number; pct?: number }) => {
  if (kind === 'sleep') {
    if (!q && !pct) return null;
    const halo = r * .75 + (Math.max(0, Math.min(100, pct)) / 100) * r * 1.35, qa = Math.max(0, Math.min(10, Math.round(q)));
    const g = rnd(seedOf('sleep' + qa));
    return (
      <g transform={`translate(${x} ${y})`}>
        <circle r={halo} fill="url(#au-sleep)" opacity={.5 + qa * .045} />
        <circle className="aring" r={r * .62} fill="none" stroke="#8B86C8" strokeWidth="1" />
        <circle className="aring" r={r * .62} fill="none" stroke="#8B86C8" strokeWidth="1" style={{ animationDelay: '-2.6s' }} />
        {Array.from({ length: qa }, (_, i) => {
          const a = (i / qa) * Math.PI * 2 + g() * .5, d = r * .72 + g() * halo * .55 + 4, s = 2 + g() * 2.6 + qa * .12;
          return <g key={i} transform={`translate(${(Math.cos(a) * d).toFixed(1)} ${(Math.sin(a) * d).toFixed(1)}) scale(${s.toFixed(2)})`}><path className="atw" d={STAR} fill="#CFC9FF" style={{ animationDelay: `${-g() * 3}s`, animationDuration: `${2.4 + g() * 2.4}s` }} /></g>;
        })}
      </g>
    );
  }
  if (kind === 'win') {
    const k = Math.min(n, 10); if (!k) return null;
    const g = rnd(seedOf('win' + k));
    return (
      <g transform={`translate(${x} ${y})`}>
        <circle r={r * .9 + k * 2.2} fill="url(#au-win)" opacity={Math.min(1, .45 + k * .09)} />
        {Array.from({ length: k }, (_, i) => { const a = -Math.PI / 2 + ((i + .5) / k - .5) * Math.PI * 1.7, l = r * .75 + 6 + g() * 12; return <line key={i} x1={Math.cos(a) * r * .62} y1={Math.sin(a) * r * .62} x2={Math.cos(a) * (r * .62 + l)} y2={Math.sin(a) * (r * .62 + l)} stroke="#D9A93C" strokeWidth="1.2" strokeLinecap="round" opacity=".5" />; })}
        {Array.from({ length: k }, (_, i) => {
          const a = -Math.PI / 2 + ((i + .5) / k - .5) * Math.PI * 1.9 + (g() - .5) * .3, d0 = r * .6, d1 = r * .6 + 18 + g() * 16, s = 3.8 + g() * 3.4;
          return <Float key={i} x={Math.cos(a) * d0} y={Math.sin(a) * d0} dx={Math.cos(a) * (d1 - d0)} dy={Math.sin(a) * (d1 - d0)} s={1} dur={3.4 + g() * 2.4} delay={-g() * 6}><g transform={`scale(${s.toFixed(2)})`}><path d={STAR} fill="#F2C94C" /></g></Float>;
        })}
      </g>
    );
  }
  const k = Math.min(n, 12); if (!k) return null;
  const g = rnd(seedOf('gr' + k));
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r * .85 + k * 2.4} fill="url(#au-gr)" opacity={Math.min(1, .45 + k * .08)} />
      {Array.from({ length: k }, (_, i) => {
        const a = -Math.PI / 2 + ((i + .5) / k - .5) * Math.PI * 1.55 + (g() - .5) * .4, d0 = r * .55, rise = 22 + g() * 16, s = 3.6 + g() * 2.6;
        return <Float key={i} x={Math.cos(a) * d0} y={Math.sin(a) * d0} dx={Math.cos(a) * rise + (g() - .5) * 8} dy={Math.sin(a) * rise * .85} s={1.15} dur={4.6 + g() * 3} delay={-g() * 7}><g transform={`rotate(${Math.round(g() * 72)})`}><Bloom r={s} c={i % 3 ? '#E7A3B5' : '#F2C3CE'} /></g></Float>;
      })}
    </g>
  );
};

export const AuraDefs = () => (
  <>
    <radialGradient id="au-gr"><stop offset="0" stopColor="#F4B6C6" stopOpacity=".55" /><stop offset="1" stopColor="#F4B6C6" stopOpacity="0" /></radialGradient>
    <radialGradient id="au-win"><stop offset="0" stopColor="#F2C94C" stopOpacity=".55" /><stop offset="1" stopColor="#F2C94C" stopOpacity="0" /></radialGradient>
    <radialGradient id="au-sleep"><stop offset="0" stopColor="#7C77C9" stopOpacity=".5" /><stop offset=".6" stopColor="#8B86C8" stopOpacity=".18" /><stop offset="1" stopColor="#8B86C8" stopOpacity="0" /></radialGradient>
  </>
);
