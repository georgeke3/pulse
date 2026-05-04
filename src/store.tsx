import React, { createContext, useContext, useEffect, useState } from 'react';
import type { AppState, Config, Event } from './types';
import { format, subDays, startOfDay } from 'date-fns';

const DEFAULT_CONFIG: Config = {
  categories: {
    training: ["Work", "Nucleus", "Family", "Friends", "Chaos", "Baseline", "Finances"],
    recovery: ["Walk", "Nap", "Meditation", "Presence check", "Family", "Friends", "Creative", "Nucleus", "Fun", "Journaling"]
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
  mottos: []
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
          mottos: parsed.mottos || [], 
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
          const val = Number(e.intensity || e.objectiveIntensity || 0); // Changed to subjective
          
          if (e.type === 'recovery') {
            fitness += val;
          } else {
            fatigue += val;
          }
        });
      }
    }

    return Math.round(fitness - fatigue);
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
