import type { AppState, CoachingReport, DayData, Duration, Event, EventType } from './types';

/**
 * Cloud sync engine (pure logic, no React / browser globals so it can be tested in Node).
 *
 * The app keeps its in-memory AppState shape. This module maps it to/from normalized Supabase rows
 * (pulse_events, pulse_days, pulse_reports, pulse_settings), diffs against what is known to be on
 * the server, and pushes only the changes.
 *
 * `Synced` is a compact map of row signatures (hashes) describing what this device last knew to be
 * on the server - small enough to persist in localStorage.
 */

export type SyncCore = Pick<AppState, 'days' | 'mottos' | 'streakCategories' | 'systemPrompt' | 'coachingHistory'>;

export interface EventRow {
  id: string;
  day: string;
  ord: number;
  type: string;
  category: string;
  intensity: number;
  objective_intensity: number;
  duration: string | null;
  custom_data: Record<string, unknown>;
  notes: string | null;
  is_expected: boolean | null;
  streak_category: string | null;
}

export interface DayRow {
  day: string;
  answers: Record<string, number>;
  note: string | null;
  motto: string | null;
}

export interface ReportRow {
  id: string;
  reported_at: string;
  content: string;
  data_snapshot: unknown;
  mode: string | null;
  feedback: string | null;
  truth_utility: string | null;
}

export interface SettingsRow {
  mottos: string[];
  streak_categories: string[];
  system_prompt: string;
}

export interface Rows {
  events: Record<string, EventRow>;
  days: Record<string, DayRow>;
  reports: Record<string, ReportRow>;
  settings: SettingsRow;
}

export interface Synced {
  events: Record<string, string>;
  days: Record<string, string>;
  reports: Record<string, string>;
  settings: string;
}

export interface Changes {
  events: { upsert: EventRow[]; remove: string[] };
  days: { upsert: DayRow[]; remove: string[] };
  reports: { upsert: ReportRow[]; remove: string[] };
  settings: SettingsRow | null;
}

export interface Api {
  request(
    method: 'GET' | 'POST' | 'DELETE',
    path: string,
    opts?: { query?: Record<string, string>; body?: unknown; headers?: Record<string, string> },
  ): Promise<unknown>;
}

/* ---------- signatures ---------- */

/** JSON with sorted keys, so Postgres jsonb key reordering never looks like a change. */
export const stable = (v: unknown): string => {
  if (v === null || typeof v !== 'object') {
    const s = JSON.stringify(v);
    return s === undefined ? 'null' : s;
  }
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  const o = v as Record<string, unknown>;
  return (
    '{' +
    Object.keys(o)
      .filter(k => o[k] !== undefined)
      .sort()
      .map(k => JSON.stringify(k) + ':' + stable(o[k]))
      .join(',') +
    '}'
  );
};

// cyrb53 string hash (53-bit) - plenty for change detection on a personal data set
const hash53 = (str: string): string => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
};

export const signature = (row: unknown): string => {
  const s = stable(row);
  return `${s.length.toString(36)}.${hash53(s)}`;
};

const EMPTY_SETTINGS: SettingsRow = { mottos: [], streak_categories: [], system_prompt: '' };

export const emptySynced = (): Synced => ({
  events: {},
  days: {},
  reports: {},
  settings: signature(EMPTY_SETTINGS),
});

const sigMap = <T>(rows: Record<string, T>): Record<string, string> => {
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(rows)) out[k] = signature(v);
  return out;
};

export const signaturesOf = (rows: Rows): Synced => ({
  events: sigMap(rows.events),
  days: sigMap(rows.days),
  reports: sigMap(rows.reports),
  settings: signature(rows.settings),
});

export const sigsEqual = (a: Synced, b: Synced): boolean => stable(a) === stable(b);

/* ---------- state <-> rows ---------- */

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const stateToRows = (core: SyncCore): Rows => {
  const events: Record<string, EventRow> = {};
  const days: Record<string, DayRow> = {};

  for (const [day, d] of Object.entries(core.days)) {
    (d.events ?? []).forEach((e, ord) => {
      events[e.id] = {
        id: e.id,
        day,
        ord,
        type: e.type,
        category: e.category,
        intensity: num(e.intensity),
        objective_intensity: num(e.objectiveIntensity),
        duration: e.duration ?? null,
        custom_data: e.custom_data ?? {},
        notes: e.notes ?? null,
        is_expected: e.isExpected ?? null,
        streak_category: e.streakCategory ?? null,
      };
    });
    const answers = d.answers ?? {};
    if (Object.keys(answers).length > 0 || d.note || d.motto) {
      days[day] = { day, answers, note: d.note || null, motto: d.motto || null };
    }
  }

  const reports: Record<string, ReportRow> = {};
  for (const r of core.coachingHistory) {
    reports[r.id] = {
      id: r.id,
      reported_at: r.date,
      content: r.content,
      data_snapshot: r.dataSnapshot ?? null,
      mode: r.mode ?? null,
      feedback: r.feedback ?? null,
      truth_utility: r.truthUtility ?? null,
    };
  }

  return {
    events,
    days,
    reports,
    settings: {
      mottos: core.mottos,
      streak_categories: core.streakCategories,
      system_prompt: core.systemPrompt ?? '',
    },
  };
};

export const rowsToCore = (rows: Rows): SyncCore => {
  const days: Record<string, DayData> = {};
  const ensure = (day: string): DayData => (days[day] ??= { events: [], answers: {}, note: '' });

  for (const r of Object.values(rows.days)) {
    const d = ensure(r.day);
    d.answers = r.answers ?? {};
    d.note = r.note ?? '';
    if (r.motto) d.motto = r.motto;
  }

  const evs = Object.values(rows.events).sort(
    (a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : a.ord - b.ord || (a.id < b.id ? -1 : 1)),
  );
  for (const r of evs) {
    const e: Event = {
      id: r.id,
      type: r.type as EventType,
      category: r.category,
      intensity: r.intensity,
      objectiveIntensity: r.objective_intensity,
      duration: r.duration as Duration,
      custom_data: r.custom_data ?? {},
      date: r.day,
    };
    if (r.notes !== null) e.notes = r.notes;
    if (r.is_expected !== null) e.isExpected = r.is_expected;
    if (r.streak_category !== null) e.streakCategory = r.streak_category;
    ensure(r.day).events.push(e);
  }

  const coachingHistory: CoachingReport[] = Object.values(rows.reports)
    .sort((a, b) => (a.reported_at < b.reported_at ? 1 : a.reported_at > b.reported_at ? -1 : a.id < b.id ? -1 : 1))
    .map(r => {
      const c: CoachingReport = { id: r.id, date: r.reported_at, content: r.content, dataSnapshot: r.data_snapshot };
      if (r.mode !== null) c.mode = r.mode as CoachingReport['mode'];
      if (r.feedback !== null) c.feedback = r.feedback;
      if (r.truth_utility !== null) c.truthUtility = r.truth_utility as CoachingReport['truthUtility'];
      return c;
    });

  return {
    days,
    mottos: rows.settings.mottos,
    streakCategories: rows.settings.streak_categories,
    systemPrompt: rows.settings.system_prompt,
    coachingHistory,
  };
};

export const rowsEmpty = (rows: Rows): boolean =>
  Object.keys(rows.events).length === 0 &&
  Object.keys(rows.days).length === 0 &&
  Object.keys(rows.reports).length === 0 &&
  signature(rows.settings) === signature(EMPTY_SETTINGS);

export const coreHasData = (core: SyncCore): boolean => !rowsEmpty(stateToRows(core));

/* ---------- diff ---------- */

const diffTable = <T>(known: Record<string, string>, rows: Record<string, T>) => {
  const upsert: T[] = [];
  for (const [key, row] of Object.entries(rows)) {
    if (known[key] !== signature(row)) upsert.push(row);
  }
  const remove = Object.keys(known).filter(k => !(k in rows));
  return { upsert, remove };
};

export const diffRows = (synced: Synced, rows: Rows): Changes => ({
  events: diffTable(synced.events, rows.events),
  days: diffTable(synced.days, rows.days),
  reports: diffTable(synced.reports, rows.reports),
  settings: synced.settings === signature(rows.settings) ? null : rows.settings,
});

export const isEmptyChanges = (c: Changes): boolean =>
  c.events.upsert.length === 0 &&
  c.events.remove.length === 0 &&
  c.days.upsert.length === 0 &&
  c.days.remove.length === 0 &&
  c.reports.upsert.length === 0 &&
  c.reports.remove.length === 0 &&
  c.settings === null;

/* ---------- network ---------- */

const chunk = <T>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const quote = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

async function fetchAll<T>(api: Api, table: string, order: string, pageSize: number): Promise<T[]> {
  const out: T[] = [];
  for (let offset = 0; ; ) {
    const page = (await api.request('GET', table, {
      query: { select: '*', order, limit: String(pageSize), offset: String(offset) },
    })) as T[] | null;
    if (!page || page.length === 0) break;
    out.push(...page);
    offset += page.length; // robust even if the server caps the page size below `pageSize`
  }
  return out;
}

export const pullRows = async (api: Api): Promise<Rows> => {
  const [ev, dy, rp, st] = await Promise.all([
    fetchAll<Record<string, any>>(api, 'pulse_events', 'day.asc,ord.asc,id.asc', 1000),
    fetchAll<Record<string, any>>(api, 'pulse_days', 'day.asc', 1000),
    fetchAll<Record<string, any>>(api, 'pulse_reports', 'id.asc', 25),
    fetchAll<Record<string, any>>(api, 'pulse_settings', 'user_id.asc', 10),
  ]);

  const rows: Rows = { events: {}, days: {}, reports: {}, settings: { ...EMPTY_SETTINGS } };
  for (const r of ev) {
    rows.events[r.id] = {
      id: r.id,
      day: r.day,
      ord: Number(r.ord),
      type: r.type,
      category: r.category,
      intensity: Number(r.intensity),
      objective_intensity: Number(r.objective_intensity),
      duration: r.duration ?? null,
      custom_data: r.custom_data ?? {},
      notes: r.notes ?? null,
      is_expected: r.is_expected ?? null,
      streak_category: r.streak_category ?? null,
    };
  }
  for (const r of dy) {
    rows.days[r.day] = { day: r.day, answers: r.answers ?? {}, note: r.note ?? null, motto: r.motto ?? null };
  }
  for (const r of rp) {
    rows.reports[r.id] = {
      id: r.id,
      reported_at: r.reported_at,
      content: r.content,
      data_snapshot: r.data_snapshot ?? null,
      mode: r.mode ?? null,
      feedback: r.feedback ?? null,
      truth_utility: r.truth_utility ?? null,
    };
  }
  if (st[0]) {
    rows.settings = {
      mottos: st[0].mottos ?? [],
      streak_categories: st[0].streak_categories ?? [],
      system_prompt: st[0].system_prompt ?? '',
    };
  }
  return rows;
};

const UPSERT = { Prefer: 'resolution=merge-duplicates,return=minimal' };

export const pushChanges = async (api: Api, userId: string, c: Changes): Promise<void> => {
  const upsert = async (table: string, conflict: string, rows: object[], size: number) => {
    for (const part of chunk(rows, size)) {
      await api.request('POST', table, {
        query: { on_conflict: conflict },
        headers: UPSERT,
        body: part.map(r => ({ ...r, user_id: userId })),
      });
    }
  };
  const remove = async (table: string, column: string, keys: string[]) => {
    for (const part of chunk(keys, 50)) {
      await api.request('DELETE', table, { query: { [column]: `in.(${part.map(quote).join(',')})` } });
    }
  };

  await upsert('pulse_events', 'user_id,id', c.events.upsert, 200);
  await upsert('pulse_days', 'user_id,day', c.days.upsert, 200);
  await upsert('pulse_reports', 'user_id,id', c.reports.upsert, 10);
  if (c.settings) await upsert('pulse_settings', 'user_id', [c.settings], 1);

  await remove('pulse_events', 'id', c.events.remove);
  await remove('pulse_days', 'day', c.days.remove);
  await remove('pulse_reports', 'id', c.reports.remove);
};
