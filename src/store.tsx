import { Loading, SyncNotice } from './omokage/Loading';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { AppState, Config, Event, CoachingReport, EventType } from './types';
import { format, subDays, startOfDay } from 'date-fns';
import { parseBackup, countState } from './backup';
import type { BackupCounts } from './backup';
import {
  coreHasData, diffRows, emptySynced, isEmptyChanges, pullRows, pushChanges, rowsEmpty, rowsToCore,
  signaturesOf, sigsEqual, stateToRows,
} from './cloudSync';
import type { Rows, Synced, SyncCore } from './cloudSync';
import { CloudHttpError } from './cloud';
import { cloud as cloudApi, cloudConfigured, useCloudSession } from './cloudClient';

export type ImportResult = { ok: true; counts: BackupCounts } | { ok: false; error: string };

export const DEFAULT_CONFIG: Config = {
  categories: {
    training: ["Work", "Nucleus", "Family", "Friends", "Chaos", "Baseline", "Finances"],
    recovery: ["Walk", "Nap", "Meditation", "Presence check", "Family", "Friends", "Creative", "Nucleus", "Fun", "Journaling"]
  },
  scales: {
    training: {
      objective: [
        { value: 1, label: "Admin/Maintenance", description: "Routine errands, laundry, emails, basic house chores." },
        { value: 2, label: "Execution", description: "Standard workday, grocery shopping, routine logistics." },
        { value: 3, label: "Heavy Load", description: "Intense study, complex project, minor house repairs, deep focus." },
        { value: 4, label: "The Heavyweight", description: "High-stakes meetings, production outages, moving house, hard conversations." },
        { value: 5, label: "Peak Intensity", description: "Major life pivot, acute crisis, maximum professional/personal risk." },
        { value: 6, label: "Massive Setback", description: "Project failure, severe financial turbulence, major social fallout." },
        { value: 7, label: "One-Way Doors", description: "Major family disputes, significant life changes, financial crossroads." },
        { value: 8, label: "Severe Volatility", description: "Sustained health or personal crisis in your immediate circle." },
        { value: 9, label: "Profound Trauma", description: "System-shocking events, deep personal loss, life-altering shocks." },
        { value: 10, label: "Theoretical Max", description: "The absolute limit of sustainable human load." }
      ],
      subjective: [
        { value: 1, label: "Flow / Minimal Cost", description: "Zero internal resistance. Activity felt restorative or effortless." },
        { value: 2, label: "Steady Burn", description: "Noticeable fuel consumption, but sustainable and calm." },
        { value: 3, label: "Grinding", description: "Heavy internal resistance, anxiety, or significant willpower required." },
        { value: 4, label: "Redlined", description: "Maximum internal toll. White-knuckled survival or total exhaustion." }
      ]
    },
    recovery: {
      objective: [
        { value: 1, label: "Micro-Reset", description: "5-min walk, physiological sigh, quick stretch." },
        { value: 2, label: "Standard Unplug", description: "Reading fiction, light movement, evening offline, social connection." },
        { value: 3, label: "Deep Down-Regulation", description: "20+ min meditation, perfect sleep, high-quality leisure." },
        { value: 4, label: "The Payoff", description: "Restorative weekend, celebrating a major milestone, deep relaxation." },
        { value: 5, label: "Profound Reset", description: "Deep connection with loved ones, breakthrough perspective, long rest." },
        { value: 6, label: "Sustained Immersion", description: "Multi-day retreat, total removal from stressors." },
        { value: 7, label: "Life-Altering", description: "Psychological breakthrough, fundamental upgrade in peace." },
        { value: 8, label: "Era Alignment", description: "Daily habits, goals, and environment in total harmony." },
        { value: 9, label: "Generational Peace", description: "Security and legacy for family and self feel firmly established." },
        { value: 10, label: "Absolute Sync", description: "Complete, profound synchronization on all physiological and mental axes." }
      ],
      subjective: [
        { value: 0, label: "Neutral", description: "Felt neither rested nor more drained." },
        { value: 1, label: "Mild Yield", description: "Didn't fully refill, but stopped the energy leak." },
        { value: 2, label: "Maintenance", description: "Solid baseline reset. Feeling ready for the next challenge." },
        { value: 3, label: "Deeply Restored", description: "Noticeably lighter and more optimistic. Anxiety cleared." },
        { value: 4, label: "Overflowing", description: "Radiating energy. Profoundly energized and ready for anything." }
      ]
    }
  },
  daily_questions: [
    {
      id: "driver",
      prompt: "1. Motivation (Driver)",
      options: [
        { value: 1, label: "Defensive", description: "Anxiety blinders up; acting to prevent failure." },
        { value: 2, label: "Grinding", description: "Pushing through friction out of raw discipline." },
        { value: 3, label: "Proactive", description: "Steady execution with clear, calm purpose." },
        { value: 4, label: "Inspired", description: "Acting purely from excitement; work feels like play." }
      ]
    },
    {
      id: "frame",
      prompt: "2. Execution (Frame)",
      options: [
        { value: 1, label: "Erratic", description: "Tunnel vision, jerky movements, hijacked by inputs." },
        { value: 2, label: "Rushed", description: "Operating slightly too fast with physical tension." },
        { value: 3, label: "Composed", description: "Standard execution; handling friction smoothly." },
        { value: 4, label: "Poised", description: "Absolute control; dictating the pace of the chaos." }
      ]
    },
    {
      id: "ego",
      prompt: "3. Identity (Ego)",
      options: [
        { value: 1, label: "Unstable", description: "Wildly overconfident/loud or deeply insecure." },
        { value: 2, label: "Drifting", description: "Catching minor swings in ego or self-doubt." },
        { value: 3, label: "Grounded", description: "Stable sense of self; doing the work without ego." },
        { value: 4, label: "Centered", description: "Supreme confidence paired with deep humility." }
      ]
    },
    {
      id: "outlook",
      prompt: "4. Capacity (Outlook)",
      options: [
        { value: 1, label: "Cynical", description: "Goals feel impossible; even fun things are draining." },
        { value: 2, label: "Numb", description: "Flatly going through the motions to survive." },
        { value: 3, label: "Present", description: "Reasonably optimistic and enjoying the downtime." },
        { value: 4, label: "Expansive", description: "Deeply joyful; the future feels bright and reachable." }
      ]
    },
    {
      id: "relational",
      prompt: "5. Relational (Connection)",
      options: [
        { value: 1, label: "Transactional", description: "Viewing other people as obstacles or resources." },
        { value: 2, label: "Obligated", description: "Engaging out of duty, but mentally checked out." },
        { value: 3, label: "Engaged", description: "Present, listening, and maintaining standard social baseline." },
        { value: 4, label: "Connected", description: "Highly empathetic; drawing actual energy from interactions." }
      ]
    },
    {
      id: "ram",
      prompt: "6. Cognition (RAM)",
      options: [
        { value: 1, label: "Fried", description: "Heavy brain fog; cannot hold variables in working memory." },
        { value: 2, label: "Sluggish", description: "Requiring heavy willpower or caffeine to stay locked in." },
        { value: 3, label: "Clear", description: "Standard computing power and normal baseline focus." },
        { value: 4, label: "Sharp", description: "Total lucidity; effortless pattern recognition and flow." }
      ]
    },
    {
      id: "gratitude",
      prompt: "7. Perspective (Gratitude)",
      options: [
        { value: 1, label: "Resentful", description: "Angry victim mindset; feeling the world is unfair." },
        { value: 2, label: "Entitled", description: "Taking the baseline for granted; hyper-focused on flaws." },
        { value: 3, label: "Appreciative", description: "Solid recognition of the good (health, family, job)." },
        { value: 4, label: "Reborn", description: "Near-death level gratitude simply to be alive and breathing." }
      ]
    },
    {
      id: "boundary",
      prompt: "8. Boundary (Self vs. Others)",
      options: [
        { value: 1, label: "Polarized", description: "Extreme martyrdom (abandoning self) or extreme selfishness." },
        { value: 2, label: "Tilted", description: "Noticeably over-giving or shutting people out entirely." },
        { value: 3, label: "Managed", description: "Holding boundaries, but it requires uncomfortable effort." },
        { value: 4, label: "Integrated", description: "Effortless balance of deep empathy and ironclad boundaries." }
      ]
    },
    {
      id: "responsibility",
      prompt: "9. Responsibility (Burden)",
      options: [
        { value: 1, label: "Dysregulated", description: "Crushed by uncontrollable weight, or entirely careless." },
        { value: 2, label: "Slipping", description: "Feeling anxiety spike, or catching urges to drop the ball." },
        { value: 3, label: "Grounded", description: "Carrying a standard, manageable daily load." },
        { value: 4, label: "Calibrated", description: "Taking absolute ownership of the controllable; releasing the rest." }
      ]
    },
    {
      id: "agency",
      prompt: "10. Agency (Control)",
      options: [
        { value: 1, label: "Delusional", description: "Helpless victim (NPC) or frantic micromanager (Tyrant)." },
        { value: 2, label: "Rigid", description: "Easily frustrated when the world doesn't execute your exact plan." },
        { value: 3, label: "Active", description: "Taking healthy initiative and adjusting to standard obstacles." },
        { value: 4, label: "Fluid", description: "Shaping reality where leveraged; flowing like water around the rest." }
      ]
    }
  ]
};

const INITIAL_STATE: AppState = {
  config: DEFAULT_CONFIG,
  days: {},
  mottos: [],
  streakCategories: [],
  geminiKey: '',
  systemPrompt: '',
  coachingHistory: []
};

export type SyncStatus = 'local' | 'loading' | 'synced' | 'saving' | 'offline' | 'error';

export interface CloudInfo {
  enabled: boolean;
  email: string | null;
  status: SyncStatus;
  error: string | null;
  lastSyncedAt: number | null;
  syncNow: () => void;
  signOut: () => Promise<void>;
}

const toCore = (s: AppState): SyncCore => ({
  days: s.days,
  mottos: s.mottos,
  streakCategories: s.streakCategories,
  systemPrompt: s.systemPrompt,
  coachingHistory: s.coachingHistory
});

const persistSynced = (userId: string, synced: Synced) => {
  try {
    localStorage.setItem('pulse_state_user', userId);
    localStorage.setItem('pulse_synced', JSON.stringify(synced));
  } catch (e) {
    console.error('Could not persist sync state', e);
  }
};

const SyncSplash = ({ status, error, onRetry }: { status: SyncStatus; error: string | null; onRetry: () => void }) => {
  const failed = status === 'offline' || status === 'error';
  if (!failed) return <Loading label="syncing your data…" />;
  return <SyncNotice label={status === 'offline' ? 'you seem to be offline' : 'sync hit a snag'} error={error} onRetry={onRetry} onSignOut={() => { void cloudApi?.signOut(); }} />;
};

interface AppContextType {
  cloud: CloudInfo;
  state: AppState;
  addEvent: (date: string, event: Omit<Event, 'id'>) => void;
  updateEvent: (date: string, event: Event) => void;
  deleteEvent: (date: string, eventId: string) => void;
  reconcileCircles: (lookup: (e: Event) => { id: string; name: string } | undefined) => void;
  updateAnswers: (date: string, answers: Record<string, number>) => void;
  updateDayNote: (date: string, note: string) => void;
  updateDayMotto: (date: string, motto: string) => void;
  addMotto: (motto: string) => void;
  deleteMotto: (motto: string) => void;
  addStreakCategory: (category: string) => void;
  deleteStreakCategory: (category: string) => void;
  updateGeminiKey: (key: string) => void;
  updateSystemPrompt: (prompt: string) => void;
  updateMotto: (oldMotto: string, newMotto: string) => void;
  getBanisterScore: (date: Date) => number;
  getBanisterDetails: (date: Date) => { 
    score: number; 
    topContributors: Array<{ category: string, impact: number, type: EventType, event: Event }>;
    upcomingCliffs: Array<{ category: string, impact: number, daysRemaining: number, type: EventType, event: Event }>;
  };
  saveCoachingReport: (content: string, dataSnapshot: any, mode: 'Standard' | 'Action Plan' | 'Philosophical') => string;
  updateCoachingReport: (id: string, updates: Partial<Pick<CoachingReport, 'feedback' | 'truthUtility'>>) => void;
  deleteCoachingReport: (id: string) => void;
  importState: (json: string) => ImportResult;
  moveEvent: (oldDate: string, newDate: string, event: Event) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem('pulse_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return { 
          days: parsed.days || {},
          mottos: parsed.mottos || [],
          streakCategories: parsed.streakCategories || [],
          geminiKey: parsed.geminiKey || '',
          systemPrompt: parsed.systemPrompt || '',
          coachingHistory: parsed.coachingHistory || [], 
          config: DEFAULT_CONFIG 
        };
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }
    return INITIAL_STATE;
  });

  // ---- Cloud sync (Supabase). Local-only mode (no env vars) skips all of this. ----
  const session = useCloudSession();
  const userId = cloudConfigured && session ? session.user.id : null;
  const email = session?.user.email ?? null;

  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  const [hydrated, setHydrated] = useState(!cloudConfigured);
  const [status, setStatus] = useState<SyncStatus>(cloudConfigured ? 'loading' : 'local');
  const [syncError, setSyncError] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<number | null>(null);

  const syncedRef = useRef<Synced>(emptySynced()); // what this device knows is on the server
  const trackedRef = useRef(false); // true once we know how local data relates to the server
  const busyRef = useRef(false);
  const queuedRef = useRef<{ pull: boolean } | null>(null);
  const adoptRef = useRef<{ state: AppState; synced: Synced } | null>(null);
  const lastPullRef = useRef(0);

  // Always keep the on-device copy current (offline cache + pending edits). Also finishes a
  // "server -> device" adoption once React has actually committed the new state.
  useEffect(() => {
    localStorage.setItem('pulse_state', JSON.stringify(state));
    const adopt = adoptRef.current;
    if (adopt && adopt.state === state && userId) {
      adoptRef.current = null;
      syncedRef.current = adopt.synced;
      trackedRef.current = true;
      persistSynced(userId, adopt.synced);
      setHydrated(true);
      setStatus('synced');
      setSyncError(null);
      setLastSyncedAt(Date.now());
    }
  }, [state, userId]);

  const run = useCallback(async (pull: boolean): Promise<void> => {
    if (!cloudApi || !userId) return;
    if (busyRef.current) {
      queuedRef.current = { pull: pull || (queuedRef.current?.pull ?? false) };
      return;
    }
    busyRef.current = true;

    const adoptServer = (base: AppState, rows: Rows) => {
      const sigs = signaturesOf(rows);
      if (sigsEqual(signaturesOf(stateToRows(toCore(base))), sigs)) {
        syncedRef.current = sigs;
        trackedRef.current = true;
        persistSynced(userId, sigs);
        setHydrated(true);
        setStatus('synced');
        setSyncError(null);
        setLastSyncedAt(Date.now());
        return;
      }
      const next: AppState = { ...base, ...rowsToCore(rows), config: DEFAULT_CONFIG };
      adoptRef.current = { state: next, synced: sigs };
      setState(prev => (prev === base ? next : prev));
    };

    try {
      const base = stateRef.current;
      adoptRef.current = null;

      if (!trackedRef.current) {
        // First contact on this device (or the cached data belonged to someone else): decide who wins.
        const rows = await pullRows(cloudApi);
        lastPullRef.current = Date.now();
        const claim = localStorage.getItem('pulse_state_user');
        const hasLocal = coreHasData(toCore(base));
        if (rowsEmpty(rows) && hasLocal && (claim === null || claim === userId)) {
          // Cloud is empty and this device holds local-only data: upload it below.
          syncedRef.current = emptySynced();
          trackedRef.current = true;
        } else {
          if (hasLocal) {
            try {
              localStorage.setItem('pulse_state_pre_cloud', JSON.stringify(base));
            } catch (e) {
              console.error('Could not store pre-cloud copy', e);
            }
          }
          adoptServer(base, rows);
          return;
        }
      }

      const changes = diffRows(syncedRef.current, stateToRows(toCore(base)));
      if (!isEmptyChanges(changes)) {
        setStatus(s => (s === 'loading' ? s : 'saving'));
        await pushChanges(cloudApi, userId, changes);
        syncedRef.current = signaturesOf(stateToRows(toCore(base)));
      }

      if (pull) {
        const fresh = await pullRows(cloudApi);
        lastPullRef.current = Date.now();
        // Only take the server's version if the user did not edit while we were talking to it.
        if (stateRef.current === base && !sigsEqual(signaturesOf(fresh), syncedRef.current)) {
          adoptServer(base, fresh);
        }
      }

      persistSynced(userId, syncedRef.current);
      setHydrated(true);
      setStatus('synced');
      setSyncError(null);
      setLastSyncedAt(Date.now());
    } catch (e) {
      const offline = e instanceof TypeError; // fetch() network failure
      console.error('Sync failed', e);
      setStatus(offline ? 'offline' : 'error');
      setSyncError(offline ? null : e instanceof CloudHttpError ? `${e.message} (${e.status})` : e instanceof Error ? e.message : 'Sync failed');
      if (trackedRef.current) setHydrated(true); // we have a trustworthy local copy: let the user in
    } finally {
      busyRef.current = false;
      const queued = queuedRef.current;
      queuedRef.current = null;
      if (queued) void runRef.current(queued.pull);
    }
  }, [userId]);

  const runRef = useRef(run);
  useEffect(() => {
    runRef.current = run;
  });

  // On sign-in / app open: restore what this device knew, then push pending edits and pull.
  useEffect(() => {
    if (!userId) return;
    const claim = localStorage.getItem('pulse_state_user');
    const raw = localStorage.getItem('pulse_synced');
    if (claim === userId && raw) {
      try {
        syncedRef.current = JSON.parse(raw) as Synced;
        trackedRef.current = true;
        setHydrated(true); // trustworthy local copy: show it now, sync in the background
      } catch {
        trackedRef.current = false;
      }
    }
    void runRef.current(true);
  }, [userId]);

  // Save edits shortly after the last change.
  useEffect(() => {
    if (!userId || !hydrated) return;
    const t = setTimeout(() => {
      void runRef.current(false);
    }, 700);
    return () => clearTimeout(t);
  }, [state, userId, hydrated]);

  // Retry after a failure, when the network returns, and when the app comes back to the foreground.
  useEffect(() => {
    if (!userId || (status !== 'offline' && status !== 'error')) return;
    const t = setTimeout(() => {
      void runRef.current(true);
    }, 20000);
    return () => clearTimeout(t);
  }, [status, userId]);

  useEffect(() => {
    if (!userId) return;
    const onOnline = () => {
      void runRef.current(true);
    };
    const onVisible = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastPullRef.current > 60_000) void runRef.current(true);
    };
    window.addEventListener('online', onOnline);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('online', onOnline);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId]);

  const cloudInfo: CloudInfo = {
    enabled: cloudConfigured,
    email,
    status,
    error: syncError,
    lastSyncedAt,
    syncNow: () => {
      setStatus(s => (s === 'loading' ? s : 'saving'));
      void runRef.current(true);
    },
    signOut: async () => {
      await cloudApi?.signOut();
    }
  };

  const addEvent = (date: string, event: Omit<Event, 'id'>) => {
    const id = crypto.randomUUID();
    const newEvent = { ...event, id };
    
    setState(prev => {
      const dayData = prev.days[date] || { events: [], answers: {}, note: '' };
      return {
        ...prev,
        days: {
          ...prev.days,
          [date]: {
            ...dayData,
            events: [...dayData.events, newEvent]
          }
        }
      };
    });
  };

  const updateEvent = (date: string, updatedEvent: Event) => {
    setState(prev => {
      const dayData = prev.days[date];
      if (!dayData) return prev;
      return {
        ...prev,
        days: {
          ...prev.days,
          [date]: {
            ...dayData,
            events: dayData.events.map(e => e.id === updatedEvent.id ? updatedEvent : e)
          }
        }
      };
    });
  };

  /** Keeps every logged event tied to its circle by id (custom_data.sid) and its stored name in step with the circle's current name.
   *  `lookup` finds the circle for an event; events it can't place are left alone. Returns the same state when nothing changed. */
  const reconcileCircles = (lookup: (e: Event) => { id: string; name: string } | undefined) => {
    setState(prev => {
      let changed = false;
      const days: AppState['days'] = {};
      for (const [d, day] of Object.entries(prev.days) as [string, AppState['days'][string]][]) {
        let dc = false;
        const events = day.events.map(e => {
          if (e.type === 'win') return e;
          const c = lookup(e);
          if (!c || (e.custom_data?.sid === c.id && e.category === c.name)) return e;
          dc = true;
          return { ...e, category: c.name, custom_data: { ...e.custom_data, sid: c.id } };
        });
        days[d] = dc ? { ...day, events } : day;
        changed = changed || dc;
      }
      return changed ? { ...prev, days } : prev;
    });
  };

  const deleteEvent = (date: string, eventId: string) => {
    setState(prev => {
      const dayData = prev.days[date];
      if (!dayData) return prev;
      return {
        ...prev,
        days: {
          ...prev.days,
          [date]: {
            ...dayData,
            events: dayData.events.filter(e => e.id !== eventId)
          }
        }
      };
    });
  };

  const updateAnswers = (date: string, answers: Record<string, number>) => {
    setState(prev => {
      const dayData = prev.days[date] || { events: [], answers: {}, note: '' };
      return {
        ...prev,
        days: {
          ...prev.days,
          [date]: {
            ...dayData,
            answers: { ...dayData.answers, ...answers }
          }
        }
      };
    });
  };

  const updateDayNote = (date: string, note: string) => {
    setState(prev => {
      const dayData = prev.days[date] || { events: [], answers: {}, note: '' };
      return {
        ...prev,
        days: {
          ...prev.days,
          [date]: {
            ...dayData,
            note
          }
        }
      };
    });
  };



  const updateGeminiKey = (geminiKey: string) => {
    setState(prev => ({ ...prev, geminiKey }));
  };

  const updateSystemPrompt = (systemPrompt: string) => {
    setState(prev => ({ ...prev, systemPrompt }));
  };

  const updateDayMotto = (date: string, motto: string) => {
    setState(prev => {
      const dayData = prev.days[date] || { events: [], answers: {}, note: '' };
      return {
        ...prev,
        days: {
          ...prev.days,
          [date]: { ...dayData, motto }
        }
      };
    });
  };

  const addMotto = (motto: string) => {
    setState(prev => {
      if (!motto || prev.mottos.includes(motto)) return prev;
      return { ...prev, mottos: [...prev.mottos, motto] };
    });
  };

  const deleteMotto = (motto: string) => {
    setState(prev => ({
      ...prev,
      mottos: prev.mottos.filter(m => m !== motto)
    }));
  };

  const addStreakCategory = (category: string) => {
    setState(prev => {
      if (!category || prev.streakCategories.includes(category)) return prev;
      return { ...prev, streakCategories: [...prev.streakCategories, category] };
    });
  };

  const deleteStreakCategory = (category: string) => {
    setState(prev => ({
      ...prev,
      streakCategories: prev.streakCategories.filter(c => c !== category)
    }));
  };


  const updateMotto = (oldMotto: string, newMotto: string) => {
    if (!newMotto) return;
    setState(prev => ({
      ...prev,
      mottos: prev.mottos.map(m => m === oldMotto ? newMotto : m)
    }));
  };


  const saveCoachingReport = (content: string, dataSnapshot: any, mode: 'Standard' | 'Action Plan' | 'Philosophical') => {
    const id = crypto.randomUUID();
    setState(prev => ({
      ...prev,
      coachingHistory: [
        { id, date: new Date().toISOString(), content, dataSnapshot, mode },
        ...prev.coachingHistory
      ]
    }));
    return id;
  };

  const updateCoachingReport = (id: string, updates: Partial<Pick<CoachingReport, 'feedback' | 'truthUtility'>>) => {
    setState(prev => ({
      ...prev,
      coachingHistory: prev.coachingHistory.map(r => r.id === id ? { ...r, ...updates } : r)
    }));
  };

  const deleteCoachingReport = (id: string) => {
    setState(prev => ({
      ...prev,
      coachingHistory: prev.coachingHistory.filter(r => r.id !== id)
    }));
  };

  const importState = (json: string): ImportResult => {
    try {
      const parsed = parseBackup(json);
      // Safety net: keep a copy of what is being replaced so a wrong import is recoverable.
      try {
        localStorage.setItem('pulse_state_pre_import', JSON.stringify(state));
      } catch (e) {
        console.error('Could not store pre-import copy', e);
      }
      setState(prev => ({
        ...prev,
        days: parsed.days,
        mottos: parsed.mottos,
        streakCategories: parsed.streakCategories,
        coachingHistory: parsed.coachingHistory,
        systemPrompt: parsed.systemPrompt ?? prev.systemPrompt,
        geminiKey: parsed.geminiKey ?? prev.geminiKey,
        config: DEFAULT_CONFIG
      }));
      return { ok: true, counts: countState(parsed) };
    } catch (e) {
      console.error('Import failed', e);
      return { ok: false, error: e instanceof Error ? e.message : 'Unknown error' };
    }
  };

  const moveEvent = (oldDate: string, newDate: string, event: Event) => {
    setState(prev => {
      const oldDayData = prev.days[oldDate];
      if (!oldDayData) return prev;
      
      const newDayData = prev.days[newDate] || { events: [], answers: {}, note: '' };
      
      const updatedOldEvents = oldDayData.events.filter(e => e.id !== event.id);
      const updatedNewEvents = [...newDayData.events, { ...event, date: newDate }];
      
      return {
        ...prev,
        days: {
          ...prev.days,
          [oldDate]: { ...oldDayData, events: updatedOldEvents },
          [newDate]: { ...newDayData, events: updatedNewEvents }
        }
      };
    });
  };

  const getBanisterScore = (targetDate: Date) => {
    return getBanisterDetails(targetDate).score;
  };

  const getBanisterDetails = (targetDate: Date) => {
    const windowDays = 8; // 7 days of impact + 1 day to hit zero
    const end = startOfDay(targetDate);

    let fitness = 0;
    let fatigue = 0;
    const contributors: Array<{ category: string, impact: number, type: EventType, date: string, event: Event }> = [];

    for (let i = 0; i < windowDays; i++) {
      const d = subDays(end, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayData = state.days[dateStr];
      
      // Linear weight: i=0 (today) is 1.0, i=7 is 0.125, i=8 is 0
      const weight = (windowDays - i) / windowDays;

      if (dayData) {
        dayData.events.forEach(e => {
          if (e.type === 'win') return; // Wins don't count towards readiness scores
          
          const baseVal = Number(e.intensity ?? e.objectiveIntensity ?? 0);
          const weightedVal = baseVal * weight;
          
          if (weightedVal > 0) {
            contributors.push({
              category: e.category,
              impact: weightedVal,
              type: e.type,
              date: dateStr,
              event: e
            });
          }

          if (e.type === 'recovery') {
            fitness += weightedVal;
          } else {
            fatigue += weightedVal;
          }
        });
      }
    }

    const score = Math.round((fitness - fatigue) * 10) / 10;

    // Process contributors for the UI
    const topContributors = [...contributors]
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 3)
      .map(c => ({ category: c.category, impact: Math.round(c.impact * 10) / 10, type: c.type, event: c.event }));

    const upcomingCliffs = contributors
      .filter(c => {
        const diff = Math.floor((end.getTime() - startOfDay(new Date(c.date)).getTime()) / (1000 * 60 * 60 * 24));
        return diff >= 6; // Days 6 and 7 are about to fall off
      })
      .sort((a, b) => b.impact - a.impact)
      .slice(0, 2)
      .map(c => {
        const diff = Math.floor((end.getTime() - startOfDay(new Date(c.date)).getTime()) / (1000 * 60 * 60 * 24));
        return {
          category: c.category,
          impact: Math.round(c.impact * 10) / 10,
          daysRemaining: 8 - diff,
          type: c.type,
          event: c.event
        };
      });

    return { score, topContributors, upcomingCliffs };
  };

  return (
    <AppContext.Provider value={{ 
      state, 
      addEvent, 
      updateEvent, 
      deleteEvent, reconcileCircles, 
      updateAnswers, 
      updateDayNote, 
      updateDayMotto, 
      addMotto, 
      deleteMotto, 
      addStreakCategory,
      deleteStreakCategory,
      updateGeminiKey, 
      updateSystemPrompt,
      updateMotto, 
      saveCoachingReport, 
      updateCoachingReport,
      deleteCoachingReport, 
      importState, 
      getBanisterScore,
      getBanisterDetails,
      moveEvent,
      cloud: cloudInfo
    }}>
      {hydrated ? children : <SyncSplash status={status} error={syncError} onRetry={cloudInfo.syncNow} />}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
