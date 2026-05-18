import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AppState, Config, Event, CoachingReport } from './types';
import { format, subDays, startOfDay } from 'date-fns';

const DEFAULT_CONFIG: Config = {
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
        { value: 0, label: "Neutral", description: "No meaningful physiological or psychological change." },
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
  geminiKey: '',
  systemPrompt: '',
  coachingHistory: []
};

interface AppContextType {
  state: AppState;
  addEvent: (date: string, event: Omit<Event, 'id'>) => void;
  updateEvent: (date: string, event: Event) => void;
  deleteEvent: (date: string, eventId: string) => void;
  updateAnswers: (date: string, answers: Record<string, number>) => void;
  updateDayNote: (date: string, note: string) => void;
  updateDayMotto: (date: string, motto: string) => void;
  addMotto: (motto: string) => void;
  deleteMotto: (motto: string) => void;
  updateGeminiKey: (key: string) => void;
  updateSystemPrompt: (prompt: string) => void;
  updateMotto: (oldMotto: string, newMotto: string) => void;
  getBanisterScore: (date: Date) => number;
  getBanisterDetails: (date: Date) => { 
    score: number; 
    topContributors: Array<{ category: string, impact: number, type: 'training' | 'recovery', event: Event }>;
    upcomingCliffs: Array<{ category: string, impact: number, daysRemaining: number, type: 'training' | 'recovery', event: Event }>;
  };
  saveCoachingReport: (content: string, dataSnapshot: any, mode: 'Standard' | 'Action Plan' | 'Philosophical') => string;
  updateCoachingReport: (id: string, updates: Partial<Pick<CoachingReport, 'feedback' | 'truthUtility'>>) => void;
  deleteCoachingReport: (id: string) => void;
  importState: (json: string) => void;
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

  useEffect(() => {
    localStorage.setItem('pulse_state', JSON.stringify(state));
  }, [state]);

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

  const importState = (json: string) => {
    try {
      const parsed = JSON.parse(json);
      if (parsed.days && parsed.config) {
        setState(parsed);
      }
    } catch (e) {
      console.error('Import failed', e);
    }
  };

  const getBanisterScore = (targetDate: Date) => {
    return getBanisterDetails(targetDate).score;
  };

  const getBanisterDetails = (targetDate: Date) => {
    const windowDays = 8; // 7 days of impact + 1 day to hit zero
    const end = startOfDay(targetDate);

    let fitness = 0;
    let fatigue = 0;
    const contributors: Array<{ category: string, impact: number, type: 'training' | 'recovery', date: string, event: Event }> = [];

    for (let i = 0; i < windowDays; i++) {
      const d = subDays(end, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayData = state.days[dateStr];
      
      // Linear weight: i=0 (today) is 1.0, i=7 is 0.125, i=8 is 0
      const weight = (windowDays - i) / windowDays;

      if (dayData) {
        dayData.events.forEach(e => {
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
      deleteEvent, 
      updateAnswers, 
      updateDayNote, 
      updateDayMotto, 
      addMotto, 
      deleteMotto, 
      updateGeminiKey, 
      updateSystemPrompt,
      updateMotto, 
      saveCoachingReport, 
      updateCoachingReport,
      deleteCoachingReport, 
      importState, 
      getBanisterScore,
      getBanisterDetails 
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};
