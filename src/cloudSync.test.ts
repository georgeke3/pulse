import { describe, it, expect } from 'vitest';
import {
  diffRows, emptySynced, isEmptyChanges, pullRows, pushChanges, rowsEmpty, rowsToCore, signaturesOf, sigsEqual, stateToRows,
} from './cloudSync';
import type { Api, SyncCore } from './cloudSync';

const USER = '11111111-1111-1111-1111-111111111111';

/** In-memory stand-in for the Supabase REST API (PostgREST subset used by the sync engine). */
const createMockApi = (opts: { maxPage?: number } = {}) => {
  const maxPage = opts.maxPage ?? 1000;
  const tables: Record<string, Map<string, Record<string, any>>> = {
    pulse_events: new Map(), pulse_days: new Map(), pulse_reports: new Map(), pulse_settings: new Map(),
  };
  const pk: Record<string, string[]> = {
    pulse_events: ['user_id', 'id'], pulse_days: ['user_id', 'day'], pulse_reports: ['user_id', 'id'], pulse_settings: ['user_id'],
  };
  const log: string[] = [];
  // Postgres jsonb stores object keys shortest-first, then alphabetically
  const jsonbify = (v: any): any => {
    if (Array.isArray(v)) return v.map(jsonbify);
    if (v && typeof v === 'object') {
      const out: Record<string, any> = {};
      Object.keys(v).sort((a, b) => a.length - b.length || (a < b ? -1 : 1)).forEach(k => { out[k] = jsonbify(v[k]); });
      return out;
    }
    return v;
  };
  const parseIn = (s: string): string[] => {
    const inner = s.slice('in.('.length, -1);
    const out: string[] = [];
    let cur = ''; let inQ = false;
    for (let i = 0; i < inner.length; i++) {
      const ch = inner[i];
      if (inQ) {
        if (ch === '\\') { cur += inner[++i]; } else if (ch === '"') { inQ = false; } else { cur += ch; }
      } else if (ch === '"') { inQ = true; } else if (ch === ',') { out.push(cur); cur = ''; } else { cur += ch; }
    }
    out.push(cur);
    return out;
  };

  const api: Api = {
    async request(method, path, o = {}) {
      const t = tables[path];
      if (!t) throw new Error('unknown table ' + path);
      const q = o.query ?? {};
      if (method === 'GET') {
        const order = (q.order ?? '').split(',').filter(Boolean).map(s => s.split('.'));
        let rows = [...t.values()];
        rows.sort((a, b) => {
          for (const [col, dir] of order) {
            if (a[col] === b[col]) continue;
            return (a[col] < b[col] ? -1 : 1) * (dir === 'desc' ? -1 : 1);
          }
          return 0;
        });
        const offset = Number(q.offset ?? 0);
        const limit = Math.min(Number(q.limit ?? maxPage), maxPage);
        rows = rows.slice(offset, offset + limit);
        log.push(`GET ${path} ${offset}`);
        return JSON.parse(JSON.stringify(rows));
      }
      if (method === 'POST') {
        if (q.on_conflict !== pk[path].join(',')) throw new Error('bad on_conflict ' + q.on_conflict);
        if (!(o.headers?.Prefer ?? '').includes('resolution=merge-duplicates')) throw new Error('missing merge-duplicates');
        for (const r of o.body as any[]) {
          if (r.user_id !== USER) throw new Error('row for wrong user');
          const stored = jsonbify({ ...r, updated_at: 'now' });
          t.set(pk[path].map(c => stored[c]).join('|'), { ...(t.get(pk[path].map(c => stored[c]).join('|')) ?? {}), ...stored });
        }
        log.push(`UPSERT ${path} ${(o.body as any[]).length}`);
        return null;
      }
      if (method === 'DELETE') {
        const [col, filter] = Object.entries(q)[0];
        const ids = new Set(parseIn(filter));
        let n = 0;
        for (const [k, r] of [...t.entries()]) if (ids.has(String(r[col]))) { t.delete(k); n++; }
        log.push(`DELETE ${path} ${n}`);
        return null;
      }
      throw new Error('bad method');
    },
  };
  return { api, tables, log };
};

const sample = (): SyncCore => ({
  days: {
    '2026-11-17': {
      events: [
        { id: 'a', type: 'training', category: 'Work', intensity: 3, objectiveIntensity: 4, duration: 'half day', custom_data: {}, notes: 'x', date: '2026-11-17', isExpected: false },
        { id: 'b', type: 'recovery', category: 'Meditation', intensity: 1.5, objectiveIntensity: 2, duration: '<1h',
          custom_data: { morning_routine: true, meditation_seconds: 640, completed_at: '2026-11-17T12:00:00.000Z' }, notes: 'journal', date: '2026-11-17', streakCategory: 'Baby' },
      ],
      answers: { driver: 3, frame: 2 }, note: 'Long day', motto: 'Steady',
    },
    '2026-11-16': {
      events: [{ id: 'c', type: 'win', category: 'Fun', intensity: 0, objectiveIntensity: 0, duration: '<1h', custom_data: {}, notes: '', date: '2026-11-16' }],
      answers: {}, note: '',
    },
  },
  mottos: ['Steady', 'Slow is smooth'],
  streakCategories: ['Baby'],
  systemPrompt: 'I am George.',
  coachingHistory: [
    { id: 'r2', date: '2026-11-16T10:00:00.000Z', content: 'new', dataSnapshot: { a: [1, { z: 1, y: 2 }] }, mode: 'Standard', feedback: 'ok', truthUtility: 'Bullseye' },
    { id: 'r1', date: '2026-10-01T10:00:00.000Z', content: 'old', dataSnapshot: null },
  ],
});

describe('rows mapping', () => {
  it('round-trips state -> rows -> state -> rows without changes (idempotent)', () => {
    const rows = stateToRows(sample());
    const back = rowsToCore(rows);
    expect(sigsEqual(signaturesOf(stateToRows(back)), signaturesOf(rows))).toBe(true);
    expect(back.days['2026-11-17'].events.map(e => e.id)).toEqual(['a', 'b']);
    expect(back.days['2026-11-17'].events[1].custom_data).toEqual(sample().days['2026-11-17'].events[1].custom_data);
    expect(back.coachingHistory.map(r => r.id)).toEqual(['r2', 'r1']);
    expect(back.mottos).toEqual(['Steady', 'Slow is smooth']);
  });

  it('keeps empty-string notes and numeric halves', () => {
    const back = rowsToCore(stateToRows(sample()));
    expect(back.days['2026-11-16'].events[0].notes).toBe('');
    expect(back.days['2026-11-17'].events[1].intensity).toBe(1.5);
  });
});

describe('push / pull against the server', () => {
  it('uploads everything to an empty server and reads it back identically', async () => {
    const { api, tables } = createMockApi({ maxPage: 2 });
    const rows = stateToRows(sample());
    const ch = diffRows(emptySynced(), rows);
    expect(ch.events.upsert.length).toBe(3);
    await pushChanges(api, USER, ch);
    expect(tables.pulse_events.size).toBe(3);
    const pulled = await pullRows(api); // maxPage 2 forces pagination
    expect(sigsEqual(signaturesOf(pulled), signaturesOf(rows))).toBe(true);
    expect(Object.keys(pulled.reports).length).toBe(2);
  });

  it('sends only what changed, including moves, deletes and settings', async () => {
    const { api, tables } = createMockApi();
    const s1 = sample();
    await pushChanges(api, USER, diffRows(emptySynced(), stateToRows(s1)));
    const synced = signaturesOf(stateToRows(s1));

    expect(isEmptyChanges(diffRows(synced, stateToRows(s1)))).toBe(true);

    const s2 = sample();
    s2.days['2026-11-17'].events[0].intensity = 4;                                  // edit
    const moved = s2.days['2026-11-16'].events.pop()!;                              // move c to another day
    s2.days['2026-11-17'].events.push({ ...moved, date: '2026-11-17' });
    s2.coachingHistory.shift();                                                     // delete report r2
    s2.mottos = ['Steady'];                                                         // settings change
    const ch = diffRows(synced, stateToRows(s2));
    expect(ch.events.upsert.map(e => e.id).sort()).toEqual(['a', 'c']);
    expect(ch.reports.remove).toEqual(['r2']);
    expect(ch.reports.upsert.length).toBe(0);
    expect(ch.settings !== null).toBe(true);
    expect(ch.days.remove).toEqual([]);

    await pushChanges(api, USER, ch);
    expect(tables.pulse_reports.size).toBe(1);
    expect(tables.pulse_events.get(USER + '|c')!.day).toBe('2026-11-17');
    expect(tables.pulse_events.get(USER + '|a')!.intensity).toBe(4);
    const pulled = await pullRows(api);
    expect(sigsEqual(signaturesOf(pulled), signaturesOf(stateToRows(s2)))).toBe(true);
  });

  it('deletes a whole event and removes an emptied day row', async () => {
    const { api, tables } = createMockApi();
    const s1 = sample();
    await pushChanges(api, USER, diffRows(emptySynced(), stateToRows(s1)));
    const synced = signaturesOf(stateToRows(s1));
    const s2 = sample();
    s2.days['2026-11-17'].events = s2.days['2026-11-17'].events.filter(e => e.id !== 'b');
    s2.days['2026-11-17'].answers = {};
    s2.days['2026-11-17'].note = '';
    s2.days['2026-11-17'].motto = undefined;
    const ch = diffRows(synced, stateToRows(s2));
    expect(ch.events.remove).toEqual(['b']);
    expect(ch.days.remove).toEqual(['2026-11-17']);
    await pushChanges(api, USER, ch);
    expect(tables.pulse_events.size).toBe(2);
    expect(tables.pulse_days.size).toBe(0);
  });

  it('is not fooled by Postgres jsonb key re-ordering', async () => {
    const { api } = createMockApi();
    const rows = stateToRows(sample());
    await pushChanges(api, USER, diffRows(emptySynced(), rows));
    const pulled = await pullRows(api);
    // server returns custom_data keys in a different order than we sent them
    expect(Object.keys(pulled.events.b.custom_data).join()).toBe('completed_at,meditation_seconds,morning_routine'.split(',').sort((a, b) => a.length - b.length || (a < b ? -1 : 1)).join());
    expect(isEmptyChanges(diffRows(signaturesOf(pulled), rows))).toBe(true);
  });

  it('deletes ids that contain quotes, commas and parentheses', async () => {
    const { api, tables } = createMockApi();
    const s = sample();
    const weird = 'we"ird,id)(';
    s.days['2026-11-17'].events.push({ ...s.days['2026-11-17'].events[0], id: weird });
    await pushChanges(api, USER, diffRows(emptySynced(), stateToRows(s)));
    expect(tables.pulse_events.size).toBe(4);
    const synced = signaturesOf(stateToRows(s));
    s.days['2026-11-17'].events = s.days['2026-11-17'].events.filter(e => e.id !== weird);
    await pushChanges(api, USER, diffRows(synced, stateToRows(s)));
    expect(tables.pulse_events.size).toBe(3);
  });

  it('knows when a server is empty', async () => {
    const { api } = createMockApi();
    expect(rowsEmpty(await pullRows(api))).toBe(true);
  });
});
