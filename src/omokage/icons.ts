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
import { MORE_ICONS } from './iconsMore';
const BASE_ICONS: IconDef[] = [
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
export const ICONS: IconDef[] = [...BASE_ICONS, ...MORE_ICONS];
const BY_KEY = new Map(ICONS.map(i => [i.key, i.src]));
export const WIN_ICON = i_win;
/** The painted icon for a key; undefined (the "letter" option, or an unknown key) falls back to the monogram. */
export const iconSrc = (key: string | undefined): string | undefined => (key ? BY_KEY.get(key) : undefined);

/** Words that should also find an icon (searched along with its key and label). */
const KEYWORDS: Record<string, string> = {
  work: 'job career office meetings boss deadline project', nucleus: 'core wife husband partner spouse couple relationship', family: 'kids child children mila parents mom dad household',
  'family-rest': 'kids child children mila parents mom dad', friends: 'buddies hangout social', chaos: 'mess crisis disorder noise', baseline: 'routine maintenance basics chores',
  finances: 'money budget bills taxes spending', journaling: 'writing diary notes reflect', fun: 'play game games enjoy', meditation: 'breathe mindfulness calm', creative: 'art paint draw build making design',
  presence: 'mindful present attention', nap: 'sleep rest doze', walk: 'stroll steps outside hike', reset: 'break pause', weather: 'rain cold heat storm', tech: 'screens phone computer scrolling',
  waiting: 'queue delay', nourishment: 'food eat meal cooking', boundary: 'limits saying no', overflow: 'too much busy', anchor: 'grounded steady', admin: 'paperwork forms email errands', health: 'doctor body appointment medical',
  home: 'house chores cleaning renovation', social: 'party event people', commute: 'drive transit travel traffic', deadlines: 'due time pressure', learning: 'study reading course class', solitude: 'alone quiet',
  sleep: 'bed night rest', movement: 'gym workout exercise lift', friction: 'conflict argument annoyance', care: 'caring caregiving looking after', exercise: 'gym workout lift run fitness training',
  'brain-fog': 'foggy fog unfocused spacey cloudy mental slow', 'chronic-pain': 'pain ache sore hurts injury back joint', nausea: 'sick queasy stomach vomit nauseous', headache: 'migraine head pain tension',
  fatigue: 'tired exhausted sleepy burnout wiped drained low energy', depression: 'low heavy sad down hopeless weight', jealousy: 'envy envious comparison', fomo: 'missing out left out excluded',
  anxiety: 'anxious worry stress nervous panic racing dread overthinking', resentment: 'bitter grudge angry resent anger', 'general-ailment': 'sick ill unwell cold flu under the weather',
  drained: 'tired exhausted spent', overwhelm: 'too much swamped', recharged: 'refreshed rested energized', grief: 'mourning sadness loss', music: 'songs listening', watching: 'tv movies shows film',
};
const words = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
/** Icons that fit what was typed, best first: label and key matches beat keyword matches; used both for search and for suggesting from a circle's name. */
export const findIcons = (query: string, limit = 5): IconDef[] => {
  const q = query.trim().toLowerCase(); if (!q) return [];
  const qw = words(q);
  return ICONS.map(ic => {
    const label = ic.label.toLowerCase(), lw = words(label + ' ' + ic.key.replace(/-/g, ' ')), kw = words(KEYWORDS[ic.key] ?? '');
    let sc = 0;
    if (label === q || ic.key === q) sc += 100; else if (label.startsWith(q)) sc += 60; else if (label.includes(q)) sc += 35;
    for (const w of qw) {
      if (lw.includes(w)) sc += 40; else if (w.length >= 3 && lw.some(x => x.startsWith(w))) sc += 25; else if (w.length >= 3 && lw.some(x => x.includes(w))) sc += 12;
      if (kw.includes(w)) sc += 22; else if (w.length >= 3 && kw.some(x => x.startsWith(w))) sc += 12;
    }
    return { ic, sc };
  }).filter(x => x.sc > 0).sort((a, b) => b.sc - a.sc || a.ic.label.localeCompare(b.ic.label)).slice(0, limit).map(x => x.ic);
};
