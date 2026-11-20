import type { CSSProperties } from 'react';
import wispO from './assets/sym-wisp1-o.png';
import wispF from './assets/sym-wisp1-f.png';
import dragonO from './assets/sym-dragon-o.png';
import dragonF from './assets/sym-dragon-f.png';
import ginkgoO from './assets/sym-ginkgo-o.png';
import ginkgoF from './assets/sym-ginkgo-f.png';
import sealO from './assets/sym-seal-o.png';
import sealF from './assets/sym-seal-f.png';
import sparkO from './assets/sym-sparkle-o.png';
import sparkF from './assets/sym-sparkle-f.png';
import orbO from './assets/sym-orb-o.png';
import orbF from './assets/sym-orb-f.png';

export type SymName = 'wisp' | 'dragon' | 'ginkgo' | 'seal' | 'sparkle' | 'orb';
const ART: Record<SymName, [string, string]> = {
  wisp: [wispO, wispF],
  dragon: [dragonO, dragonF],
  ginkgo: [ginkgoO, ginkgoF],
  seal: [sealO, sealF],
  sparkle: [sparkO, sparkF],
  orb: [orbO, orbF],
};

export const Sym = ({ n, on, s = 22, o = 1 }: { n: SymName; on: boolean; s?: number; o?: number }) => (
  <img
    src={ART[n][on ? 1 : 0]}
    alt=""
    aria-hidden="true"
    draggable={false}
    style={{ width: s, height: s, objectFit: 'contain', opacity: o, flex: 'none', display: 'block' }}
  />
);

import drSwirl from './assets/dr-swirl.png';
import drGhost from './assets/dr-ghost.png';
import drRiderG from './assets/dr-riderg.png';
import drRiderW from './assets/dr-riderw.png';
import drPeek from './assets/dr-peek.png';
import drLegs from './assets/dr-legs.png';
import drTiny from './assets/dr-tiny.png';

export type DrgName = 'swirl' | 'ghost' | 'riderg' | 'riderw' | 'peek' | 'legs' | 'tiny';
const DRG: Record<DrgName, string> = { swirl: drSwirl, ghost: drGhost, riderg: drRiderG, riderw: drRiderW, peek: drPeek, legs: drLegs, tiny: drTiny };

/** The dragon line as small illustrations. Width-based; height follows the picture. */
export const Drg = ({ n, w, o = 1, style }: { n: DrgName; w: number; o?: number; style?: CSSProperties }) => (
  <img src={DRG[n]} alt="" aria-hidden="true" draggable={false} style={{ width: w, height: 'auto', opacity: o, display: 'block', flex: 'none', pointerEvents: 'none', ...style }} />
);
