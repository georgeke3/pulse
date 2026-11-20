import { CRIMSON, GOLD, SEPIA, SKY, type Mode } from './skins';
import tabHome from './assets/tab-home.png';
import tabPast from './assets/tab-past.png';
import tabPresent from './assets/tab-present.png';
import tabFuture from './assets/tab-future.png';

export const BF = 'M0 0 C-2 -7 -9 -13 -14 -10 C-18 -7 -15 -2 -8 1 C-13 3 -14 9 -9 10 C-5 11 -2 6 0 2 C2 6 5 11 9 10 C14 9 13 3 8 1 C15 -2 18 -7 14 -10 C9 -13 2 -7 0 0Z';
export type BStyle = 'fill' | 'outline' | 'glow';

/** A butterfly as an SVG <g>, for use inside an <svg>. */
export const Fly = ({ x, y, s = 1, r = 0, c = '#9AABC0', o = 1, st = 'fill', d = 0 }: { x: number; y: number; s?: number; r?: number; c?: string; o?: number; st?: BStyle; d?: number }) => (
  <g transform={`translate(${x},${y}) rotate(${r}) scale(${s})`} opacity={o}>
    <g className="bf" style={{ animationDelay: `${d}s` }}>
      {st === 'outline' && <><path d={BF} fill={c} fillOpacity=".08" stroke={c} strokeWidth={1.1 / s} strokeLinejoin="round" /><path d="M0 -3 V7" stroke={c} strokeWidth={1 / s} /></>}
      {st === 'glow' && <><path d={BF} fill="#fff" opacity=".9" /><path d={BF} fill={c} opacity=".45" /></>}
      {st === 'fill' && <path d={BF} fill={c} />}
    </g>
  </g>
);

/** Standalone butterfly icon. */
export const Butterfly = ({ c = SKY, s = 16, st = 'fill', dashed = false, o = 1 }: { c?: string; s?: number; st?: BStyle; dashed?: boolean; o?: number }) => (
  <svg width={s * 1.2} height={s} viewBox="-16 -13 32 26" aria-hidden="true">
    <path d={BF} fill={st === 'outline' ? 'none' : c} fillOpacity={o} stroke={dashed ? 'rgba(43,50,71,.3)' : c} strokeWidth="1" strokeDasharray={dashed ? '2 2' : undefined} />
  </svg>
);

export const Belt = ({ d, c = GOLD, w = 9, o = .32, stitch = true }: { d: string; c?: string; w?: number; o?: number; stitch?: boolean }) => (
  <g className="ribbon">
    <path d={d} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" opacity={o} />
    {stitch && <path d={d} fill="none" stroke="#fff" strokeWidth="1" strokeDasharray="3 5" opacity=".9" />}
  </g>
);
export const Pencil = ({ d, c = SEPIA, o = .45 }: { d: string; c?: string; o?: number }) => (
  <g>
    <path d={d} fill="none" stroke={c} strokeWidth="1" opacity={o} strokeLinecap="round" />
    <path d={d} fill="none" stroke={c} strokeWidth=".7" opacity={o * .7} transform="translate(2,7)" strokeDasharray="14 3 30 2" />
    <path d={d} fill="none" stroke={c} strokeWidth="5" opacity=".06" transform="translate(1,3)" />
  </g>
);
export const Sparkles = ({ pts, c = '#fff' }: { pts: [number, number, number, number][]; c?: string }) => (
  <>{pts.map(([x, y, s, o], i) => <path key={i} className="spark" style={{ animationDelay: `${i * .7}s` }} transform={`translate(${x},${y}) scale(${s})`} d="M0 -6 L1.3 -1.3 L6 0 L1.3 1.3 L0 6 L-1.3 1.3 L-6 0 L-1.3 -1.3Z" fill={c} opacity={o} />)}</>
);

const hatch = (x0: number, y0: number, n: number, o: number) => Array.from({ length: n }, (_, i) => <line key={i} x1={x0 + i * 7} y1={y0 - i * 2} x2={x0 - 30 + i * 7} y2={y0 + 60 - i * 2} stroke={SEPIA} strokeWidth=".7" opacity={o} />);

/** Full-screen atmosphere behind each mode. Drawn on a 393×852 board, scaled to cover. */
export const Atmos = ({ mode }: { mode: Mode }) => {
  const box = { className: 'atmos', viewBox: '0 0 393 852', preserveAspectRatio: 'xMidYMid slice', 'aria-hidden': true } as const;
  if (mode === 'past') return (
    <>
      <svg {...box}>
        <defs>
          <filter id="omk-grain"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="3" stitchTiles="stitch" /><feColorMatrix values="0 0 0 0 .42  0 0 0 0 .33  0 0 0 0 .22  0 0 0 .5 0" /></filter>
          <radialGradient id="omk-vig" cx="50%" cy="45%" r="75%"><stop offset="65%" stopColor={SEPIA} stopOpacity="0" /><stop offset="100%" stopColor={SEPIA} stopOpacity=".16" /></radialGradient>
        </defs>
        <rect width="393" height="852" filter="url(#omk-grain)" opacity=".16" />
        <rect width="393" height="852" fill="url(#omk-vig)" />
        {hatch(330, 760, 8, .22)}{hatch(-10, 100, 7, .18)}
      </svg>
    </>
  );
  if (mode === 'present') return (
    <svg {...box}>
      {Array.from({ length: 27 }, (_, i) => <line key={i} x1="0" x2="393" y1={120 + i * 28} y2={120 + i * 28} stroke={GOLD} strokeWidth=".5" opacity=".10" />)}
      <line x1="22" x2="22" y1="0" y2="852" stroke={CRIMSON} strokeWidth=".6" opacity=".14" />
      <circle cx="330" cy="120" r="150" fill="none" stroke={GOLD} strokeWidth=".6" opacity=".18" />
      <circle cx="330" cy="120" r="110" fill="none" stroke={GOLD} strokeWidth=".6" opacity=".12" strokeDasharray="2 6" />
      <path d="M330 -30 V270 M180 120 H480" stroke={GOLD} strokeWidth=".5" opacity=".14" />
    </svg>
  );
  if (mode === 'future') return (
    <>
      <div className="atmos" style={{ background: 'linear-gradient(170deg,#F4F7FB 0%,#E6ECF4 45%,#D5DEEA 100%)' }} />
      <div className="mistband" style={{ left: -120, top: '28%', width: 640, height: 90 }} />
      <div className="mistband" style={{ left: -160, top: '70%', width: 700, height: 80, opacity: .8 }} />
      <svg {...box}><Sparkles pts={[[60, 180, .8, .9], [340, 250, .6, .8], [120, 420, .5, .7], [372, 520, .9, .9], [40, 610, .6, .6], [300, 96, .45, .8], [230, 780, .5, .6]]} /><Sparkles c={CRIMSON} pts={[[86, 300, .4, .5], [270, 420, .35, .4]]} /></svg>
    </>
  );
  return (
    <>
      <div className="atmos" style={{ background: 'linear-gradient(160deg,#F7F1E5 0%,#FBFAF6 42%,#FDFDFB 55%,#E6ECF4 100%)' }} />
      <svg {...box}><Sparkles pts={[[330, 700, .6, .9], [370, 620, .45, .8], [290, 790, .4, .7]]} />{hatch(-10, 560, 6, .16)}</svg>
    </>
  );
};

/* ---- tab icons: the dragon line. Home = the grown dragon, Past = its ghost, Present = still growing, Future = the next generation ---- */
const TAB_ART: Record<Mode, string> = { home: tabHome, past: tabPast, present: tabPresent, future: tabFuture };
export const Glyph = ({ mode, on }: { mode: Mode; on: boolean }) => (
  <img src={TAB_ART[mode]} alt="" aria-hidden="true" draggable={false} className={`tabart ${on ? 'on' : ''}`} />
);
