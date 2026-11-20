import type { Mode } from './skins';

/** Faint watermark emblem behind each mode (refs: crest, sword emblem, support ring). */
export const Watermark = ({ mode }: { mode: Mode }) => {
  const ink = { present: '#6B4F1E', past: '#34405A', future: '#1F2A44', home: '#6B4F1E' }[mode];
  const common = { fill: 'none', stroke: ink, strokeWidth: 1.2 } as const;
  if (mode === 'present') return (
    <svg className="watermark" viewBox="0 0 200 240" style={{ width: 340, left: '50%', top: '42%', transform: 'translate(-50%,-50%)' }} aria-hidden>
      <path d="M100 12 L172 38 V112 C172 160 140 198 100 222 C60 198 28 160 28 112 V38Z" {...common} strokeWidth={2} />
      <path d="M100 26 L160 48 V112 C160 152 134 184 100 206 C66 184 40 152 40 112 V48Z" {...common} />
      <path d="M100 40 V196 M86 70 H114 M92 70 L100 54 L108 70 M100 196 l-6 -10 h12z" {...common} strokeWidth={2} />
      <path d="M64 120 C76 104 90 110 100 124 C110 110 124 104 136 120" {...common} />
      <circle cx="100" cy="148" r="16" {...common} />
    </svg>
  );
  if (mode === 'past') return (
    <svg className="watermark" viewBox="0 0 200 200" style={{ width: 360, right: -90, top: 120, transform: 'rotate(-14deg)' }} aria-hidden>
      <path d="M100 90 C80 30 20 30 28 78 C34 108 70 110 100 100Z M100 90 C120 30 180 30 172 78 C166 108 130 110 100 100Z" {...common} strokeWidth={1.6} />
      <path d="M100 104 C78 112 48 132 62 162 C76 176 92 140 100 116Z M100 104 C122 112 152 132 138 162 C124 176 108 140 100 116Z" {...common} strokeWidth={1.6} />
      <path d="M100 76 V150 M100 76 C96 60 88 50 80 44 M100 76 C104 60 112 50 120 44" {...common} />
      <path d="M44 60 C60 66 76 74 92 88 M156 60 C140 66 124 74 108 88" {...common} strokeDasharray="3 4" />
    </svg>
  );
  if (mode === 'future') return (
    <svg className="watermark" viewBox="0 0 200 200" style={{ width: 420, left: '50%', top: '38%', transform: 'translate(-50%,-50%) rotate(8deg)', opacity: .09 }} aria-hidden>
      <path d="M100 6 L112 88 L194 100 L112 112 L100 194 L88 112 L6 100 L88 88Z" {...common} strokeWidth={1.6} />
      <path d="M100 40 L106 94 L160 100 L106 106 L100 160 L94 106 L40 100 L94 94Z" {...common} />
      <circle cx="100" cy="100" r="70" {...common} strokeDasharray="2 6" />
      <circle cx="100" cy="100" r="88" {...common} />
    </svg>
  );
  return (
    <svg className="watermark" viewBox="0 0 200 200" style={{ width: 380, left: '50%', top: '58%', transform: 'translate(-50%,-50%)', opacity: .08 }} aria-hidden>
      <circle cx="100" cy="100" r="80" {...common} strokeWidth={1.6} />
      <circle cx="100" cy="100" r="64" {...common} strokeDasharray="3 5" />
      {[0, 120, 240].map(a => { const r = (a - 90) * Math.PI / 180; return <circle key={a} cx={100 + 80 * Math.cos(r)} cy={100 + 80 * Math.sin(r)} r="12" fill="#F2EEE6" stroke={ink} strokeWidth="1.6" />; })}
      <path d="M100 20 L169 140 L31 140Z" {...common} />
    </svg>
  );
};

/** Trailing ribbons — "wind" — in the three mode colours. */
export const Wisps = ({ h = 90, strong = false }: { h?: number; strong?: boolean }) => (
  <svg className="wisps" viewBox="0 0 360 90" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: h }} aria-hidden>
    <path d="M-20 64 C50 22 110 92 182 50 S300 8 380 40" stroke="#6F86A3" strokeWidth={strong ? 2.4 : 1.8} opacity=".5" />
    <path d="M-20 76 C70 42 132 98 204 64 S312 30 380 60" stroke="#C9A86A" strokeWidth={strong ? 2.6 : 2} opacity=".6" />
    <path d="M-20 48 C50 72 122 20 192 38 S322 72 380 22" stroke="#9B3A44" strokeWidth={strong ? 1.8 : 1.4} opacity=".42" />
  </svg>
);

/** Little butterfly used in bursts and as an ornament. */
export const Butterfly = ({ c = '#6F86A3', s = 14 }: { c?: string; s?: number }) => (
  <svg width={s} height={s} viewBox="0 0 32 32" aria-hidden>
    <path d="M16 15 C12 4 3 6 5 13 C6 18 12 18 16 16Z M16 15 C20 4 29 6 27 13 C26 18 20 18 16 16Z" fill={c} fillOpacity=".55" stroke={c} strokeWidth="1.2" />
    <path d="M16 17 C12 18 7 22 10 27 C13 29 15 23 16 19Z M16 17 C20 18 25 22 22 27 C19 29 17 23 16 19Z" fill={c} fillOpacity=".4" stroke={c} strokeWidth="1.2" />
  </svg>
);

export const Ground = ({ mode }: { mode: Mode }) => (
  <>
    <div className="ground g-grad" />
    <Watermark mode={mode} />
    <div className="ground g-grain" />
    <div className="ground g-vignette" />
  </>
);
