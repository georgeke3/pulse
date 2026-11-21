// The icon library every stimulus picks from. Keys are stable (they are stored); add new art at the end of a group.
import i_win from './assets/cat-win.png';
import i_work from './assets/cat-work.png';
import i_nucleus from './assets/cat-nucleus.png';
import i_family from './assets/cat-family.png';
import i_family_rest from './assets/cat-family-rest.png';
import i_friends from './assets/cat-friends.png';
import i_chaos from './assets/cat-chaos.png';
import i_baseline from './assets/cat-baseline.png';
import i_finances from './assets/cat-finances.png';
import i_journaling from './assets/cat-journaling.png';
import i_fun from './assets/cat-fun.png';
import i_meditation from './assets/cat-meditation.png';
import i_creative from './assets/cat-creative.png';
import i_presence from './assets/cat-presence.png';
import i_nap from './assets/cat-nap.png';
import i_walk from './assets/cat-walk.png';
import i_reset from './assets/cat-reset.png';
import i_weather from './assets/cat-weather.png';
import i_tech from './assets/cat-tech.png';
import i_waiting from './assets/cat-waiting.png';
import i_nourishment from './assets/cat-nourishment.png';
import i_boundary from './assets/cat-boundary.png';
import i_overflow from './assets/cat-overflow.png';
import i_anchor from './assets/cat-anchor.png';
import i_admin from './assets/cat-admin.png';
import i_health from './assets/cat-health.png';
import i_home from './assets/cat-home.png';
import i_social from './assets/cat-social.png';
import i_commute from './assets/cat-commute.png';
import i_deadlines from './assets/cat-deadlines.png';
import i_learning from './assets/cat-learning.png';
import i_solitude from './assets/cat-solitude.png';
import i_sleep from './assets/cat-sleep.png';
import i_movement from './assets/cat-movement.png';
import i_friction from './assets/cat-friction.png';
import i_care from './assets/cat-care.png';

export interface IconDef { key: string; label: string; src: string }
export const ICONS: IconDef[] = [
  { key: 'work', label: 'Work', src: i_work }, { key: 'nucleus', label: 'Nucleus', src: i_nucleus }, { key: 'family', label: 'Family', src: i_family },
  { key: 'family-rest', label: 'Family (rest)', src: i_family_rest }, { key: 'friends', label: 'Friends', src: i_friends }, { key: 'chaos', label: 'Chaos', src: i_chaos },
  { key: 'baseline', label: 'Baseline', src: i_baseline }, { key: 'finances', label: 'Finances', src: i_finances }, { key: 'journaling', label: 'Journaling', src: i_journaling },
  { key: 'fun', label: 'Fun', src: i_fun }, { key: 'meditation', label: 'Meditation', src: i_meditation }, { key: 'creative', label: 'Creative', src: i_creative },
  { key: 'presence', label: 'Presence', src: i_presence }, { key: 'nap', label: 'Nap', src: i_nap }, { key: 'walk', label: 'Walk', src: i_walk },
  { key: 'reset', label: 'Reset', src: i_reset }, { key: 'weather', label: 'Weather', src: i_weather }, { key: 'tech', label: 'Screens', src: i_tech },
  { key: 'waiting', label: 'Waiting', src: i_waiting }, { key: 'nourishment', label: 'Nourishment', src: i_nourishment }, { key: 'boundary', label: 'Boundary', src: i_boundary },
  { key: 'overflow', label: 'Overflow', src: i_overflow }, { key: 'anchor', label: 'Anchor', src: i_anchor }, { key: 'admin', label: 'Admin', src: i_admin },
  { key: 'health', label: 'Health', src: i_health }, { key: 'home', label: 'Home', src: i_home }, { key: 'social', label: 'Social', src: i_social },
  { key: 'commute', label: 'Commute', src: i_commute }, { key: 'deadlines', label: 'Deadlines', src: i_deadlines }, { key: 'learning', label: 'Learning', src: i_learning },
  { key: 'solitude', label: 'Solitude', src: i_solitude }, { key: 'sleep', label: 'Sleep', src: i_sleep }, { key: 'movement', label: 'Movement', src: i_movement },
  { key: 'friction', label: 'Friction', src: i_friction }, { key: 'care', label: 'Care', src: i_care },
];
const BY_KEY = new Map(ICONS.map(i => [i.key, i.src]));
export const WIN_ICON = i_win;
/** The painted icon for a key; undefined (the "letter" option, or an unknown key) falls back to the monogram. */
export const iconSrc = (key: string | undefined): string | undefined => (key ? BY_KEY.get(key) : undefined);
