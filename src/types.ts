export type EventType = 'training' | 'recovery';
export type Duration = '<1h' | 'couple hours' | 'half day' | 'whole day';

export interface ScaleAnchor {
  value: number;
  label: string;
  description: string;
}

export interface QuestionOption {
  value: number;
  label: string;
  description?: string;
}

export interface DailyQuestion {
  id: string;
  prompt: string;
  options: QuestionOption[];
}

export interface Event {
  id: string;
  type: EventType;
  category: string;
  intensity: number; // Subjective (1-4)
  objectiveIntensity: number; // Objective (1-10)
  duration: Duration;
  custom_data: Record<string, any>;
  notes?: string;
  date: string; 
}

export interface DayData {
  events: Event[];
  answers: Record<string, number>;
  note?: string;
  motto?: string;
}

export interface Config {
  categories: {
    training: string[];
    recovery: string[];
  };
  scales: {
    training: {
      objective: ScaleAnchor[];
      subjective: ScaleAnchor[];
    };
    recovery: {
      objective: ScaleAnchor[];
      subjective: ScaleAnchor[];
    };
  };
  daily_questions: DailyQuestion[];
}

export interface CoachingReport {
  id: string;
  date: string; // ISO string of when it was generated
  content: string;
  dataSnapshot: any; // The data it analyzed
}

export interface AppState {
  config: Config;
  days: Record<string, DayData>;
  mottos: string[];
  geminiKey?: string;
  coachingHistory: CoachingReport[];
}
