/** Intensity scale v2: ten steps, each a roughly constant ratio heavier than the last (about x1.35), so 1-6 carry everyday
 *  granularity while 7-8 stay for heavy days and 9-10 for real extremes. Duration lives in the load % control, never here. */
export const SCALE_VERSION = 2;

type Side = 'training' | 'recovery';

/** Old (linear) level -> new level, used by the one-off backfill and by the classic logging screens. */
const LEGACY: Record<Side, Record<number, number>> = {
  training: { 0: 0, 1: 1, 2: 4, 3: 6, 4: 7, 5: 8, 6: 9, 7: 9, 8: 9, 9: 10, 10: 10 },
  recovery: { 0: 0, 1: 1, 2: 4, 3: 5, 4: 7, 5: 8, 6: 9, 7: 9, 8: 9, 9: 10, 10: 10 },
};
export const newFromLegacy = (side: Side, v: number) => LEGACY[side][Math.max(0, Math.min(10, Math.round(v)))] ?? v;

/** New level (1-10) -> the old-scale equivalent, for averages and gaps that compare against the 1-4 subjective score. */
const EQ = [0, 1, 1.5, 1.75, 2, 2.5, 3, 4, 5, 6.5, 9];
export const legacyEq = (lvl: number) => EQ[Math.max(0, Math.min(10, Math.round(lvl)))];

/** New level -> 1-4 subjective score derived for logs made on the Present tab (same results the old formula gave for the same event). */
const SUBJ = [1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 4];
export const subjectiveFor = (lvl: number) => SUBJ[Math.max(0, Math.min(10, Math.round(lvl)))];
