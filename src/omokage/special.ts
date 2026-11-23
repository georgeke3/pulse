import type { EventType } from '../types';

/** training / recovery are the circles on the ring that carry load; win and gratitude are text-only; sleep sets the day's opening rest. */
export const isStim = (t: EventType) => t === 'training' || t === 'recovery';
export const isText = (t: EventType) => t === 'win' || t === 'gratitude';

/** Sleep: quality (1-10, how restorative) scales how much of the sleep you needed (amount, 0-100%) into the day's starting reserve. */
export const sleepFactor = (q: number) => 0.4 + 0.6 * (Math.max(1, Math.min(10, q)) - 1) / 9;
export const sleepReserve = (amount: number, q: number) => Math.round(amount * sleepFactor(q));
export const SLEEP_BANDS = [
  { to: 20, label: 'Scraps' },
  { to: 40, label: 'Well short' },
  { to: 60, label: 'Half a night' },
  { to: 80, label: 'Most of it' },
  { to: 100, label: 'Full night' },
];
export const sleepBand = (pct: number) => SLEEP_BANDS.find(b => pct <= b.to) ?? SLEEP_BANDS[SLEEP_BANDS.length - 1];
