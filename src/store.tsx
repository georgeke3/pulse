import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AppState, Config, Event } from './types';
import { format, subDays, startOfDay } from 'date-fns';

const DEFAULT_CONFIG: Config = {
  categories: {
    training: ["Work", "Nucleus", "Family", "Friends", "Chaos", "Baseline", "Finances"],
    recovery: ["Walk", "Nap", "Meditation", "Presence check", "Family", "Friends", "Creative", "Nucleus", "Fun"]
  },
  scales: {
    training: {
      objective: [
        { value: 1, label: "Administrative", description: "Routine annoyances, chores, emails." },
        { value: 2, label: "Standard Execution", description: "Daily deep work, regular logistics." },
        { value: 3, label: "Heavy Cognitive Load", description: "Architecture, intensive study, debugging." },
        { value: 4, label: "The Heavyweight", description: "High-stakes, production outages, hard talks." },
        { value: 5, label: "The 1-Rep Max", description: "Major pivot, acute crisis, technical risk." },
        { value: 6, label: "Massive Setback", description: "Severe turbulence, failed major project." },
        { value: 7, label: "One-Way Doors", description: "Major family disputes, financial crises." },
        { value: 8, label: "Severe Volatility", description: "Sustained health/personal crisis in circle." },
        { value: 9, label: "Profound Trauma", description: "System-shocking events, profound loss." },
        { value: 10, label: "Absolute Limit", description: "Theoretical maximum human load." }
      ],
      subjective: [
        { value: 1, label: "Flow / Minimal Cost", description: "Zero internal resistance. Time vanished." },
        { value: 2, label: "Smooth", description: "Noticeable fuel burn, but steady." },
        { value: 3, label: "Grinding", description: "Heavy resistance, anxiety, or doubt." },
        { value: 4, label: "Redlined", description: "Maximum toll. White-knuckled survival." }
      ]
    },
    recovery: {
      objective: [
        { value: 1, label: "Micro-Reset", description: "5-min walk, physiological sigh." },
        { value: 2, label: "Standard Unplug", description: "Lifting, reading fiction, evening offline." },
        { value: 3, label: "Deep Down-Regulation", description: "20+ min meditation, perfect sleep." },
        { value: 4, label: "The Payoff", description: "Celebrating milestone, restorative weekend." },
        { value: 5, label: "Deep Connection", description: "Vulnerable talk, breakthrough perspective." },
        { value: 6, label: "Sustained Immersion", description: "Multi-day retreat, no stressors." },
        { value: 7, label: "Life-Altering", description: "Psychological breakthrough, upgraded baseline." },
        { value: 8, label: "Deep Era Alignment", description: "Daily habits and goals in perfect harmony." },
        { value: 9, label: "Generational Peace", description: "Extended family and legacy feel secure." },
        { value: 10, label: "Total Alignment", description: "Complete synchronization on all axes." }
      ],
      subjective: [
        { value: 1, label: "Mild Yield", description: "Didn't refill, but stopped the bleeding." },
        { value: 2, label: "Maintenance", description: "Solid baseline reset. Ready for next load." },
        { value: 3, label: "Deeply Restored", description: "Noticeably lighter. Anxiety cleared." },
        { value: 4, label: "Overflowing", description: "Deeply energized, highly optimistic." }
      ]
    }
  },
  daily_questions: [
    {
      id: "driver",
      prompt: "1. Driver of Action (Motivation)",
      options: [
        { value: 1, label: "Defensive" },
        { value: 2, label: "Grinding" },
        { value: 3, label: "Proactive" },
        { value: 4, label: "Inspired" }
      ]
    },
    {
      id: "frame",
      prompt: "2. Frame & Composure (Execution)",
      options: [
        { value: 1, label: "Erratic" },
        { value: 2, label: "Rushed" },
        { value: 3, label: "Composed" },
        { value: 4, label: "Poised" }
      ]
    },
    {
      id: "ego",
      prompt: "3. Ego & Stability (Identity)",
      options: [
        { value: 1, label: "Unstable" },
        { value: 2, label: "Drifting" },
        { value: 3, label: "Grounded" },
        { value: 4, label: "Sweet Spot" }
      ]
    },
    {
      id: "outlook",
      prompt: "4. Joy & Outlook (Capacity)",
      options: [
        { value: 1, label: "Cynical" },
        { value: 2, label: "Numb" },
        { value: 3, label: "Present" },
        { value: 4, label: "Expansive" }
      ]
    },
    {
      id: "relational",
      prompt: "5. Relational & Connection",
      options: [
        { value: 1, label: "Transactional" },
        { value: 2, label: "Duty-Bound" },
        { value: 3, label: "Engaged" },
        { value: 4, label: "Deeply Connected" }
      ]
    },
    {
      id: "ram",
      prompt: "6. Cognitive RAM (Computing)",
      options: [
        { value: 1, label: "Fried" },
        { value: 2, label: "Sluggish" },
        { value: 3, label: "Clear" },
        { value: 4, label: "Razor Sharp" }
      ]
    }
  ]
};

const INITIAL_STATE: AppState = {
  config: DEFAULT_CONFIG,
  days: {}
};

interface AppContextType {
  state: AppState;
  addEvent: (date: string, event: Omit<Event, 'id'>) => void;
  updateEvent: (date: string, event: Event) => void;
  deleteEvent: (date: string, eventId: string) => void;
  updateAnswers: (date: string, answers: Record<string, number>) => void;
  updateDayNote: (date: string, note: string) => void;
  getBanisterScore: (date: Date) => number;
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

  const getBanisterScore = (targetDate: Date) => {
    const windowDays = 7;
    const end = startOfDay(targetDate);

    let fitness = 0;
    let fatigue = 0;

    for (let i = 0; i < windowDays; i++) {
      const d = subDays(end, i);
      const dateStr = format(d, 'yyyy-MM-dd');
      const dayData = state.days[dateStr];
      
      if (dayData) {
        dayData.events.forEach(e => {
          const val = Number(e.objectiveIntensity || e.intensity || 0);
          if (e.type === 'recovery') {
            fitness += val;
          } else {
            fatigue += val;
          }
        });
      }
    }

    return fitness - fatigue;
  };

  return (
    <AppContext.Provider value={{ 
      state, 
      addEvent, 
      updateEvent, 
      deleteEvent, 
      updateAnswers, 
      updateDayNote, 
      getBanisterScore 
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
