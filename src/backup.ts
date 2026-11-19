import type { AppState, CoachingReport, DayData } from './types';

/**
 * Backup / restore helpers. Pure data logic lives here (no React) so it can be tested in isolation.
 *
 * Export format: the full app state as flat top-level keys (days, mottos, streakCategories,
 * systemPrompt, coachingHistory, config, ...) plus a `backupMeta` block. Flat keys keep it
 * compatible with older backups and older importers.
 *
 * Every key of the app state is exported EXCEPT the ones in EXCLUDED_KEYS, so any field added to
 * the state in the future is backed up automatically.
 */

export const BACKUP_FORMAT_VERSION = 2;

/** Secrets that must never end up in a backup file that might be shared. Re-enter after restoring. */
const EXCLUDED_KEYS: readonly string[] = ['geminiKey'];

export interface BackupCounts {
  days: number;
  events: number;
  dailyAnswers: number;
  dayNotes: number;
  dayMottos: number;
  mottos: number;
  streakCategories: number;
  coachingReports: number;
}

export interface BuiltBackup {
  json: string;
  filename: string;
  counts: BackupCounts;
  /** true when re-reading the generated JSON yields exactly the same counts as the live state */
  verified: boolean;
  bytes: number;
}

export interface ParsedBackup {
  days: Record<string, DayData>;
  mottos: string[];
  streakCategories: string[];
  coachingHistory: CoachingReport[];
  /** undefined when the file does not contain it (so the current value is kept on import) */
  systemPrompt?: string;
  geminiKey?: string;
}

type CountableState = {
  days: Record<string, DayData>;
  mottos: string[];
  streakCategories: string[];
  coachingHistory: CoachingReport[];
};

export const countState = (s: CountableState): BackupCounts => {
  let events = 0;
  let dailyAnswers = 0;
  let dayNotes = 0;
  let dayMottos = 0;
  const dayKeys = Object.keys(s.days);
  for (const key of dayKeys) {
    const d = s.days[key];
    events += d.events.length;
    dailyAnswers += Object.keys(d.answers).length;
    if (d.note) dayNotes += 1;
    if (d.motto) dayMottos += 1;
  }
  return {
    days: dayKeys.length,
    events,
    dailyAnswers,
    dayNotes,
    dayMottos,
    mottos: s.mottos.length,
    streakCategories: s.streakCategories.length,
    coachingReports: s.coachingHistory.length,
  };
};

export const describeCounts = (c: BackupCounts): string =>
  [
    `${c.days} days`,
    `${c.events} events`,
    `${c.dailyAnswers} daily answers`,
    `${c.dayNotes} day notes`,
    `${c.coachingReports} AI reports`,
    `${c.mottos} mottos`,
    `${c.streakCategories} streak categories`,
  ].join(' · ');

const pad = (n: number) => String(n).padStart(2, '0');

export const backupFilename = (now: Date): string =>
  `omokage-backup-${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}.json`;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

/** Tolerant reader: accepts current and older backup shapes, fills in anything missing. */
export const parseBackup = (text: string): ParsedBackup => {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error('That file is not valid JSON.');
  }
  if (!isPlainObject(raw)) throw new Error('That file is not an Omokage backup.');
  if (!isPlainObject(raw.days)) throw new Error('No "days" data found. Is this an Omokage backup?');

  const days: Record<string, DayData> = {};
  for (const [date, value] of Object.entries(raw.days)) {
    const d = isPlainObject(value) ? value : {};
    days[date] = {
      ...(d as object),
      events: Array.isArray(d.events) ? (d.events as DayData['events']) : [],
      answers: isPlainObject(d.answers) ? (d.answers as Record<string, number>) : {},
    } as DayData;
  }

  const strings = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

  return {
    days,
    mottos: strings(raw.mottos),
    streakCategories: strings(raw.streakCategories),
    coachingHistory: Array.isArray(raw.coachingHistory) ? (raw.coachingHistory as CoachingReport[]) : [],
    systemPrompt: typeof raw.systemPrompt === 'string' ? raw.systemPrompt : undefined,
    geminiKey: typeof raw.geminiKey === 'string' && raw.geminiKey ? raw.geminiKey : undefined,
  };
};

export const buildBackup = (state: AppState, now: Date = new Date()): BuiltBackup => {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(state)) {
    if (!EXCLUDED_KEYS.includes(key)) data[key] = value;
  }
  const counts = countState(state);
  const payload = {
    ...data,
    backupMeta: {
      app: 'omokage',
      formatVersion: BACKUP_FORMAT_VERSION,
      exportedAt: now.toISOString(),
      counts,
      note: 'geminiKey is intentionally not included.',
    },
  };
  const json = JSON.stringify(payload, null, 2);

  let verified = false;
  try {
    const back = countState(parseBackup(json));
    verified = JSON.stringify(back) === JSON.stringify(counts);
  } catch {
    verified = false;
  }

  return { json, filename: backupFilename(now), counts, verified, bytes: json.length };
};

export type DeliverResult = 'shared' | 'downloaded' | 'cancelled' | 'failed';

/**
 * Hands the backup to the user. Must be called straight from a tap handler (no awaits before it)
 * so mobile browsers still treat it as a user gesture.
 *  1. Share sheet with a real file (iOS/Android: "Save to Files", AirDrop, Drive...)
 *  2. Blob download via an anchor attached to the page (desktop browsers)
 * A big `data:` URI + detached link is what used to fail on phones.
 */
export const shareOrDownloadBackup = async (json: string, filename: string): Promise<DeliverResult> => {
  try {
    const file = new File([json], filename, { type: 'application/json' });
    if (typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: filename });
      return 'shared';
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    // any other share error: fall back to a normal download
  }

  try {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return 'downloaded';
  } catch {
    return 'failed';
  }
};

export const copyText = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
};
