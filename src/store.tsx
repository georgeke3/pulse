import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AppState, Config, Event, CoachingReport, EventType } from './types';
import { format, subDays, startOfDay } from 'date-fns';

const DEFAULT_CONFIG: Config = {
  categories: {
    training: ["Work", "Nucleus", "Family", "Friends", "Chaos", "Baseline", "Finances"],
    recovery: ["Walk", "Nap", "Meditation", "Presence check", "Creative", "Fun", "Journaling"]
  },
  scales: {
    training: {
      objective: [
        { value: 1, label: "Trivial", description: "Minimal mental energy" },
        { value: 2, label: "Routine", description: "Standard daily execution" },
        { value: 3, label: "Engagement", description: "Requires focus" },
        { value: 5, label: "Deep Work", description: "Sustained high intensity" },
        { value: 8, label: "Marathon", description: "Draining sustained effort" },
        { value: 10, label: "Overload", description: "Full CNS burnout risk" }
      ],
      subjective: [
        { value: 1, label: "Fluid", description: "Felt effortless" },
        { value: 2, label: "Yielding", description: "Standard cost" },
        { value: 3, label: "Heavy", description: "Harder than it should be" },
        { value: 4, label: "Grind", description: "Pure willpower used" }
      ]
    },
    recovery: {
      objective: [
        { value: 1, label: "Micro", description: "5-15 min reset" },
        { value: 2, label: "Standard", description: "30-60 min focus" },
        { value: 3, label: "Deep", description: "2h+ dedicated restorative" },
        { value: 5, label: "Sacred", description: "Half-day reset" }
      ],
      subjective: [
        { value: 0, label: "Neutral", description: "No noticeable shift" },
        { value: 1, label: "Mild", description: "Slightly better" },
        { value: 2, label: "Maintenance", description: "Held the line" },
        { value: 3, label: "Deeply Restored", description: "System rebooted" },
        { value: 4, label: "Overflowing", description: "Ready for absolute chaos" }
      ]
    }
  },
  daily_questions: [
    {
      id: "motivation",
      prompt: "How high was your 'want-to' (vs 'have-to') today?",
      options: [
        { value: 1, label: "Pure Resistance", description: "Dragging every step" },
        { value: 2, label: "Standard", description: "Doing what needs to be done" },
        { value: 3, label: "Hungry", description: "Proactively seeking load" },
        { value: 4, label: "Apex", description: "Total alignment" }
      ]
    },
    {
      id: "presence",
      prompt: "How frequently were you 'lost in thought'?",
      options: [
        { value: 1, label: "Fully Drifted", description: "Disconnected from now" },
        { value: 2, label: "Standard", description: "Normal mental noise" },
        { value: 3, label: "Sharp", description: "Noticeably present" },
        { value: 4, label: "Locked In", description: "Deep presence all day" }
      ]
    },
    {
      id: "fluidity",
      prompt: "How was your word retrieval / processing speed?",
      options: [
        { value: 1, label: "Stuttering", description: "Noticeable lag in thoughts" },
        { value: 2, label: "Standard", description: "Normal day" },
        { value: 3, label: "Crisp", description: "Fast, clear articulation" },
        { value: 4, label: "God Mode", description: "Hyper-articulate/No lag" }
      ]
    },
    {
      id: "boundaries",
      prompt: "Did you maintain your planned work/life boundaries?",
      options: [
        { value: 1, label: "Total Collapse", description: "Lost control of my day" },
        { value: 2, label: "Yielded", description: "Let others dictate my time" },
        { value: 3, label: "Maintained", description: "Kept the line" },
        { value: 4, label: "Sovereign", description: "Total agency over my time" }
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
  importState: (json: string) => void;
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
      deleteEvent, 
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
      moveEvent
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
