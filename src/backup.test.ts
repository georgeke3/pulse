import { describe, it, expect } from 'vitest';
import { buildBackup, countState, parseBackup } from './backup';
import type { AppState } from './types';
import { DEFAULT_CONFIG } from './store';

const sampleState = (): AppState & { futureField: { keep: boolean } } => ({
  config: DEFAULT_CONFIG,
  days: {
    '2026-11-17': {
      events: [
        {
          id: 'e1', type: 'training', category: 'Work', intensity: 3, objectiveIntensity: 4,
          duration: 'half day', custom_data: {}, notes: 'Prod outage 🔥 – “quotes” & ünïcode', date: '2026-11-17', isExpected: false,
        },
        {
          id: 'e2', type: 'recovery', category: 'Meditation', intensity: 2, objectiveIntensity: 2,
          duration: '<1h', custom_data: { meditation_seconds: 640, morning_routine: true, completed_at: '2026-11-17T12:00:00.000Z' },
          notes: 'Morning journal entry', date: '2026-11-17', streakCategory: 'No Sugar',
        },
      ],
      answers: { driver: 3, frame: 2, ego: 4 },
      note: 'Long day',
      motto: 'Steady',
    },
    '2026-11-18': { events: [], answers: {} },
  },
  mottos: ['Steady', 'Slow is smooth'],
  streakCategories: ['No Sugar'],
  geminiKey: 'SECRET-KEY-123',
  systemPrompt: 'I am George.',
  coachingHistory: [
    {
      id: 'r1', date: '2026-11-16T10:00:00.000Z', content: '## Report\nBody', mode: 'Standard',
      dataSnapshot: { nested: [{ a: 1 }, { b: [2, 3] }] }, feedback: 'accurate', truthUtility: 'Bullseye',
    },
  ],
  futureField: { keep: true },
});

describe('backup export', () => {
  it('counts everything entered', () => {
    const c = countState(sampleState());
    expect(c).toEqual({
      days: 2, events: 2, dailyAnswers: 3, dayNotes: 1, dayMottos: 1,
      mottos: 2, streakCategories: 1, coachingReports: 1,
    });
  });

  it('passes its own verification and never contains the API key', () => {
    const b = buildBackup(sampleState(), new Date(2026, 10, 18, 23, 5));
    expect(b.verified).toBe(true);
    expect(b.json.includes('SECRET-KEY-123')).toBe(false);
    expect(b.filename).toBe('pulse-backup-2026-11-18-2305.json');
  });

  it('round-trips all user data losslessly', () => {
    const s = sampleState();
    const parsed = parseBackup(buildBackup(s).json);
    expect(parsed.days).toEqual(s.days);
    expect(parsed.mottos).toEqual(s.mottos);
    expect(parsed.streakCategories).toEqual(s.streakCategories);
    expect(parsed.coachingHistory).toEqual(s.coachingHistory);
    expect(parsed.systemPrompt).toBe('I am George.');
    expect(parsed.geminiKey).toBeUndefined();
  });

  it('exports fields added to the state in the future', () => {
    const raw = JSON.parse(buildBackup(sampleState()).json);
    expect(raw.futureField).toEqual({ keep: true });
    expect(raw.config).toBeTruthy(); // stays loadable by older importers
    expect(raw.backupMeta.counts.events).toBe(2);
  });
});

describe('backup import', () => {
  it('rejects junk without throwing away data', () => {
    expect(() => parseBackup('not json')).toThrow();
    expect(() => parseBackup('[]')).toThrow();
    expect(() => parseBackup('{"hello":1}')).toThrow();
  });

  it('accepts older backups that lack newer fields', () => {
    const parsed = parseBackup(JSON.stringify({ config: {}, days: { '2026-01-01': { events: [{ id: 'x' }] } } }));
    expect(parsed.days['2026-01-01'].answers).toEqual({});
    expect(parsed.coachingHistory).toEqual([]);
    expect(parsed.systemPrompt).toBeUndefined();
  });
});
