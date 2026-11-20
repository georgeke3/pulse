import c_win from './assets/cat-win.png';
import c_work from './assets/cat-work.png';
import c_nucleus from './assets/cat-nucleus.png';
import c_family from './assets/cat-family.png';
import c_family_rest from './assets/cat-family-rest.png';
import c_friends from './assets/cat-friends.png';
import c_chaos from './assets/cat-chaos.png';
import c_baseline from './assets/cat-baseline.png';
import c_finances from './assets/cat-finances.png';
import c_journaling from './assets/cat-journaling.png';
import c_fun from './assets/cat-fun.png';
import c_meditation from './assets/cat-meditation.png';
import c_creative from './assets/cat-creative.png';
import c_presence from './assets/cat-presence.png';
import c_nap from './assets/cat-nap.png';
import c_walk from './assets/cat-walk.png';
import type { EventType } from '../types';

const ART: Record<string, string> = { 'win': c_win, 'work': c_work, 'nucleus': c_nucleus, 'family': c_family, 'family-rest': c_family_rest, 'friends': c_friends, 'chaos': c_chaos, 'baseline': c_baseline, 'finances': c_finances, 'journaling': c_journaling, 'fun': c_fun, 'meditation': c_meditation, 'creative': c_creative, 'presence': c_presence, 'nap': c_nap, 'walk': c_walk };
/** The painted icon for a category, by its first word; rest-side Family gets the two-dragon version. Unknown → undefined (falls back to the monogram). */
export const catArt = (type: EventType, name: string): string | undefined => {
  if (type === 'win') return ART.win;
  const k = name.trim().split(/\s+/)[0].toLowerCase();
  if (type === 'recovery' && k === 'family') return ART['family-rest'];
  return ART[k];
};
