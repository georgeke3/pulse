// Load and recovery as a share of one day's capacity.
// 100% load = the most stress you can take in a day and still fully recover by tomorrow, with no carryover.
// 100% recovery = the inverse: enough rest to fully undo a 100% load day. Each instance adds its share; totals can pass 100%.
import type { Event, EventType } from '../types';

export const STEP = 5;
export interface Band { to: number; label: string }
export const BANDS: Record<'training' | 'recovery', Band[]> = {
  training: [
    { to: 10, label: 'Forgettable task' },
    { to: 25, label: 'Takes up mindspace' },
    { to: 60, label: 'A meaningful chunk of the day' },
    { to: 80, label: 'The main focus of the day' },
    { to: 100, label: 'Singular focus' },
  ],
  recovery: [
    { to: 10, label: 'A breath' },
    { to: 25, label: 'Takes the edge off' },
    { to: 60, label: 'A real refill' },
    { to: 80, label: 'The main recovery of the day' },
    { to: 100, label: 'A full reset' },
  ],
};
export const bandOf = (t: EventType, pct: number) => {
  const b = BANDS[t === 'recovery' ? 'recovery' : 'training'];
  return b.find(x => pct <= x.to) ?? b[b.length - 1];
};
export const loadOf = (e: Event): number | null => (typeof e.custom_data?.load === 'number' ? e.custom_data.load : null);
export const sideTotal = (events: Event[], t: 'training' | 'recovery', skip?: string) =>
  events.reduce((a, e) => a + (e.type === t && e.id !== skip ? loadOf(e) ?? 0 : 0), 0);
export const snap = (p: number) => Math.max(STEP, Math.min(100, Math.round(p / STEP) * STEP));

const hex = (c: string) => [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16));
const mix = (a: string, b: string, k: number) => `rgb(${hex(a).map((v, i) => Math.round(v + (hex(b)[i] - v) * k)).join(',')})`;
/** Spoke colour from intensity 1-10: pale tint for light, deep for heavy. */
export const RAMP: Record<'training' | 'recovery', [string, string]> = { training: ['#F5D6C5', '#A9441F'], recovery: ['#D4E0EE', '#2D5788'] };
export const heat = (t: 'training' | 'recovery', lvl: number) => mix(RAMP[t][0], RAMP[t][1], Math.max(0, Math.min(1, (lvl - 1) / 9)));
