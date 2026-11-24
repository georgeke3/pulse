// Balance: one running number for "how burnt out vs how available am I".
//   daily net   = rest - load, as a % of one day's capacity (last night's sleep reserve counts as rest; 100% load + 100% rest = 0)
//   balance(d)  = balance(d-1) x FADE + net(d)      debt and surplus both fade, with a ~2.5 day half-life at FADE .75
// Surplus is capped (a week of good rest can't fully pay for a terrible day later); debt is not.
// Recomputed from the events each time (no stored state), so edits and backfills are always reflected.
// Intensity is NOT a multiplier: the load % is already the final cost. Intensity says what KIND of stimulus it was (see mix()).
import type { DayData, Event } from '../types';
import { dstr, fromDstr } from './skins';
import { loadOf } from './load';
import { sleepReserve } from './special';

export const FADE = 0.75;
export const CAP = 100;
export const WINDOW = 28;
const ASSUMED_SLEEP = 60;           // a day with activity but no sleep logged opens at this reserve (flagged on screen)
/** Old events logged before the % existed: intensity 1-10 -> a rough share of a day. */
const LEGACY_PCT = [0, 3, 5, 8, 12, 18, 26, 38, 55, 78, 100];

export interface Band { id: string; label: string; to: number; line: string }
export const BANDS: Band[] = [
  { id: 'depleted', label: 'Depleted', to: -120, line: 'Running well below empty. Protect tonight and tomorrow.' },
  { id: 'burnt', label: 'Burnt', to: -60, line: 'Carrying real debt. Rest has to outweigh load for a few days.' },
  { id: 'strained', label: 'Strained', to: -20, line: 'Leaning on yesterday. Fine, but not for long.' },
  { id: 'steady', label: 'Steady', to: 20, line: 'Load and rest are about even.' },
  { id: 'available', label: 'Available', to: 60, line: 'Some room in the tank.' },
  { id: 'surplus', label: 'Surplus', to: Infinity, line: 'Well rested. This is the day to take on something big.' },
];
export const bandOf = (score: number) => BANDS.find(b => score < b.to) ?? BANDS[BANDS.length - 1];
/** Tone for colour: negative runs ember, positive runs sky. */
export const tone = (score: number) => (score < -20 ? 'load' : score > 20 ? 'rest' : 'even') as 'load' | 'rest' | 'even';

const pctOf = (e: Event): number => {
  const l = loadOf(e);
  if (l !== null) return Math.max(0, l);
  if (e.type === 'sleep') {
    const a = e.custom_data?.amount;
    return typeof a === 'number' ? sleepReserve(a, Math.round(e.objectiveIntensity || 5)) : 0;
  }
  return LEGACY_PCT[Math.max(0, Math.min(10, Math.round(e.objectiveIntensity ?? e.intensity ?? 0)))] ?? 0;
};

export interface DayPoint { day: string; load: number; rest: number; net: number; bal: number; assumed: boolean; logged: boolean }
export interface Mix { small: number; mid: number; heavy: number; nSmall: number; nMid: number; nHeavy: number; total: number; kind: 'many-small' | 'few-big' | 'mixed' | 'quiet'; line: string }
export interface Driver { day: string; name: string; pct: number; weighted: number; lvl: number; side: 'load' | 'rest' }
export interface Balance { score: number; band: Band; series: DayPoint[]; mix: Mix; drivers: Driver[]; assumed: boolean; any: boolean }

export function computeBalance(days: Record<string, DayData>, today: string, fade = FADE): Balance {
  const t0 = fromDstr(today);
  const series: DayPoint[] = [], drivers: Driver[] = [];
  let bal = 0, anyLogged = false, assumedToday = false;
  const mixAcc = { small: 0, mid: 0, heavy: 0, nSmall: 0, nMid: 0, nHeavy: 0 };
  for (let i = WINDOW - 1; i >= 0; i--) {
    const d = new Date(t0); d.setDate(d.getDate() - i);
    const k = dstr(d), ev = days[k]?.events ?? [];
    let load = 0, rest = 0, sleep = false, stim = false;
    for (const e of ev) {
      const p = pctOf(e);
      if (e.type === 'training') { load += p; stim = true; }
      else if (e.type === 'recovery') { rest += p; stim = true; }
      else if (e.type === 'sleep') { rest += p; sleep = true; }
      else continue;
      if (i < 7 && p > 0) {
        const w = Math.pow(fade, i) * p, lvl = Math.round(e.objectiveIntensity || 0);
        drivers.push({ day: k, name: e.category, pct: p, weighted: w, lvl, side: e.type === 'training' ? 'load' : 'rest' });
        if (e.type === 'training') {
          const g = lvl >= 7 ? 'heavy' : lvl >= 5 ? 'mid' : 'small';
          mixAcc[g] += p; mixAcc[g === 'heavy' ? 'nHeavy' : g === 'mid' ? 'nMid' : 'nSmall'] += 1;
        }
      }
    }
    const logged = stim || sleep;
    const assumed = stim && !sleep;
    if (assumed) rest += ASSUMED_SLEEP;
    if (i === 0) assumedToday = assumed;
    const net = logged ? rest - load : 0;
    bal = Math.min(CAP, bal * fade + net);
    if (logged) anyLogged = true;
    series.push({ day: k, load, rest, net, bal, assumed, logged });
  }
  const total = mixAcc.small + mixAcc.mid + mixAcc.heavy;
  const share = (v: number) => (total ? v / total : 0);
  const n = mixAcc.nSmall + mixAcc.nMid + mixAcc.nHeavy;
  const kind: Mix['kind'] = n < 3 || total < 30 ? 'quiet'
    : share(mixAcc.small) >= .5 && mixAcc.nSmall >= 8 ? 'many-small'
    : share(mixAcc.heavy) >= .5 ? 'few-big' : 'mixed';
  const pc = (v: number) => Math.round(share(v) * 100);
  const line = kind === 'many-small' ? `${pc(mixAcc.small)}% of this week’s load came from ${mixAcc.nSmall} small things. Batch them or let some go.`
    : kind === 'few-big' ? `${pc(mixAcc.heavy)}% of this week’s load came from ${mixAcc.nHeavy} heavy hit${mixAcc.nHeavy === 1 ? '' : 's'}. Leave real space to recover after them.`
    : kind === 'mixed' ? 'A mix of small things and bigger hits this week.'
    : 'Not enough logged this week to see a pattern.';
  drivers.sort((a, b) => b.weighted - a.weighted);
  const score = Math.round(bal);
  return { score, band: bandOf(score), series: series.slice(-14), mix: { ...mixAcc, total, kind, line }, drivers: drivers.slice(0, 40), assumed: assumedToday, any: anyLogged };
}
