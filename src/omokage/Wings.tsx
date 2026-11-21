import sparkF from './assets/sym-sparkle-f.png';
import type { Event } from '../types';
import { RIM } from './LogSheet';
import { EMBER, GOLD, INK2, SKY } from './skins';
import { useStimuli } from './stimuli';

// The day as a pair of wings: load feathers fan out on the left, rest on the right. One feather per event,
// reach = intensity (1-10), tipped with that circle's icon. Order is only used to give each feather a stable angle.
const W = 393, H = 138, OX = W / 2, OY = 126, SPAN = 160, RISE = 98, R = 12;
/** Feather i of n sits at its own spot along the wing (fixed spacing while there's room, compressed only once it's full), so tips never stack.
 *  Its height is its intensity. */
const slot = (i: number, n: number, lvl: number) => {
  const step = n <= 6 ? 28 : (SPAN - 32) / (n - 1);
  return { x: 32 + i * step, y: 12 + (Math.max(1, Math.min(10, lvl)) - 1) / 9 * (RISE - 12) };
};

export const Wings = ({ events, onOpen }: { events: Event[]; onOpen: (id: string) => void }) => {
  const st = useStimuli();
  const load = events.filter(e => e.type === 'training'), rest = events.filter(e => e.type === 'recovery'), wins = events.filter(e => e.type === 'win');
  const wing = (list: Event[], side: -1 | 1) => list.map((e, i) => {
    const { x, y } = slot(i, list.length, e.objectiveIntensity || 1);
    const tx = OX + side * x, ty = OY - y;
    const L = Math.hypot(tx - OX, ty - OY), dx = (tx - OX) / L, dy = (ty - OY) / L;
    const px = -dy, py = dx, w = 4 + L * .05;                           // perpendicular, for the feather's width
    const mx = OX + dx * L * .5, my = OY + dy * L * .5;
    const [rim, fill] = RIM[e.type], src = st.art(e.type, e.category);
    return (
      <g key={e.id} onClick={() => onOpen(e.id)} style={{ cursor: 'pointer' }}>
        <path d={`M${OX} ${OY} Q ${mx + px * w} ${my + py * w} ${tx} ${ty} Q ${mx - px * w} ${my - py * w} ${OX} ${OY} Z`} fill={fill} stroke={rim} strokeWidth=".8" opacity=".7" />
        <circle cx={tx} cy={ty} r={R} fill="#FFFEFB" stroke={rim} strokeWidth="1.2" />
        {src ? <image href={src} x={tx - R + 1.5} y={ty - R + 1.5} width={2 * R - 3} height={2 * R - 3} preserveAspectRatio="xMidYMid meet" />
          : <text x={tx} y={ty} fontSize="11" textAnchor="middle" dominantBaseline="central" fill={rim} fontFamily="Lora, serif" fontWeight="600">{e.category[0]}</text>}
        <circle cx={tx} cy={ty} r="19" fill="transparent" />
      </g>
    );
  });
  const empty = events.length === 0;
  return (
    <div style={{ height: H, flex: 'none', position: 'relative' }}>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%', overflow: 'visible' }} aria-label="Today as wings: load on the left, rest on the right">
        {[-1, 1].map(s => (
          <path key={s} d={`M${OX} ${OY} Q ${OX + s * 80} ${OY - 20} ${OX + s * 172} ${OY - 96}`} fill="none" stroke={s < 0 ? EMBER : SKY} strokeWidth=".9" strokeDasharray="1 5" strokeLinecap="round" opacity={empty ? .5 : .28} />
        ))}
        {empty && <text x={OX} y={OY - 56} fontSize="12" textAnchor="middle" fill={INK2} fontFamily="Lora, serif" fontStyle="italic">your wings fill in as you log</text>}
        {wing(load, -1)}{wing(rest, 1)}
        {wins.map((e, i) => {
          const x = OX + (i - (wins.length - 1) / 2) * 15, y = OY - 22 - (i % 2) * 6;
          return (
            <g key={e.id} onClick={() => onOpen(e.id)} style={{ cursor: 'pointer' }}>
              <image href={sparkF} x={x - 8} y={y - 9} width="16" height="18" preserveAspectRatio="xMidYMid meet" />
              <circle cx={x} cy={y} r="13" fill="transparent" />
            </g>
          );
        })}
        <circle cx={OX} cy={OY} r="4.5" fill={GOLD} stroke="#fff" strokeWidth="1.5" />
      </svg>
    </div>
  );
};
