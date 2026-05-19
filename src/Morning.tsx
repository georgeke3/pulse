import { useState, useRef } from 'react';
import { format, subDays, addDays, eachDayOfInterval } from 'date-fns';
import { Sparkles, Play, Square, Check, Loader2, Zap, Share2, Heart, Users } from 'lucide-react';
import { useApp } from './store';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Phase = 'init' | 'grounding' | 'meditation' | 'journaling' | 'complete';

export const MorningView = () => {
  const { state, addEvent } = useApp();
  const [phase, setPhase] = useState<Phase>('init');
  const [loading, setLoading] = useState(false);
  const [groundingText, setGroundingText] = useState<string | null>(null);
  const [focusIntention, setFocusIntention] = useState<string | null>(null);
  
  // Timer State
  const [timerActive, setTimerActive] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<any>(null);
  const BASELINE_SECONDS = 10 * 60; // 10 minutes baseline

  // Journaling State
  const [journalEntry, setJournalEntry] = useState('');
  const [subjectiveYield, setSubjectiveYield] = useState(3);
  const [validations, setValidations] = useState({
    sentToKat: false,
    sentToFamily: false,
    sharedWin: false
  });

  const startMorning = async () => {
    if (!state.geminiKey) {
      alert("Please add your Gemini API Key in Settings first.");
      return;
    }
    setPhase('grounding');
    setLoading(true);

    const now = new Date();
    const start = subDays(now, 3);
    const end = addDays(now, 2); // Include some future for "upcoming instances"
    const daysInRange = eachDayOfInterval({ start, end });

    const contextData = daysInRange.map(d => {
      const dStr = format(d, 'yyyy-MM-dd');
      const data = state.days[dStr];
      if (!data) return null;
      return {
        date: dStr,
        motto: data.motto,
        notes: data.note,
        scores: data.answers,
        events: data.events.map(e => ({
          type: e.type,
          cat: e.category,
          obj: e.objectiveIntensity,
          sub: e.intensity,
          dur: e.duration,
          isExpected: e.isExpected
        }))
      };
    }).filter(d => d !== null);

    const prompt = `
      You are an elite performance coach and grounding guide. 
      Analyze George's recent CNS data (last 3 days) and upcoming planned events.
      
      USER PROFILE:
      ${state.systemPrompt || 'No profile provided.'}

      RECENT & UPCOMING DATA:
      ${JSON.stringify(contextData, null, 2)}

      TASK:
      1. Generate a 3rd-person grounding statement ("State of George"). 
         - Be hyperspecific to today's context.
         - Acknowledge recent wins or friction points.
         - Tone: Wise, calm, slightly directive.
      2. Generate a 1-2 sentence focus intention for today.

      OUTPUT FORMAT (JSON):
      {
        "grounding": "...",
        "intention": "..."
      }
    `;

    try {
      const genAI = new GoogleGenerativeAI(state.geminiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const cleanText = text.replace(/```json|```/g, '').trim();
      const parsed = JSON.parse(cleanText);
      
      setGroundingText(parsed.grounding);
      setFocusIntention(parsed.intention);
    } catch (e) {
      console.error("Failed to generate grounding", e);
      setGroundingText("George is entering today with a blank slate. Focus on presence.");
      setFocusIntention("Steady process over frantic execution.");
    } finally {
      setLoading(false);
    }
  };

  const toggleTimer = () => {
    if (timerActive) {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimerActive(false);
    } else {
      setTimerActive(true);
      timerRef.current = setInterval(() => {
        setSeconds(s => s + 1);
      }, 1000);
    }
  };

  const finishMeditation = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false);
    setPhase('journaling');
  };

  const submitMorningLog = () => {
    const durationMins = Math.floor(seconds / 60);
    let objectiveIntensity = 1;
    if (durationMins >= 20) objectiveIntensity = 3;
    else if (durationMins >= 10) objectiveIntensity = 2;

    const durationLabel = seconds < 3600 ? '<1h' : 'couple hours';

    addEvent(format(new Date(), 'yyyy-MM-dd'), {
      type: 'recovery',
      category: 'Meditation',
      intensity: subjectiveYield,
      objectiveIntensity,
      duration: durationLabel as any,
      custom_data: {
        meditation_seconds: seconds,
        validations,
        morning_routine: true
      },
      notes: journalEntry,
      date: format(new Date(), 'yyyy-MM-dd'),
      isExpected: false
    });

    setPhase('complete');
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-6 min-h-screen bg-white text-gray-900 pb-32">
      <header className="mb-12">
        <h1 className="text-3xl font-black tracking-tight mb-1">Morning Ritual</h1>
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-600">静写 • Seisha</p>
      </header>

      {phase === 'init' && (
        <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in fade-in duration-700">
          <div className="w-24 h-24 rounded-full bg-gray-50 flex items-center justify-center border border-gray-100 shadow-inner">
            <Zap size={40} className="text-purple-600" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black">Ready to ground?</h2>
            <p className="text-xs font-bold text-gray-400">Initialize your daily activation engine.</p>
          </div>
          <button 
            onClick={startMorning}
            className="w-full max-w-xs py-4 bg-gray-900 text-white rounded-2xl font-black text-sm active:scale-95 transition-all shadow-xl"
          >
            Initiate Sequence
          </button>
        </div>
      )}

      {phase === 'grounding' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="text-purple-600 animate-spin" size={32} />
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Consulting history & plan...</p>
            </div>
          ) : (
            <>
              <div className="bg-gray-900 rounded-[2.5rem] p-8 space-y-6 shadow-2xl border border-gray-800 text-left">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-purple-400" />
                  <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">State of George</h2>
                </div>
                <p className="text-lg font-black text-gray-100 leading-tight">
                  "{groundingText}"
                </p>
                <div className="pt-4 border-t border-gray-800">
                  <p className="text-xs font-bold text-purple-400 leading-relaxed italic">
                    Focus: {focusIntention}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setPhase('meditation')}
                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-sm active:scale-95 transition-all shadow-lg"
              >
                Proceed to Stillness
              </button>
            </>
          )}
        </div>
      )}

      {phase === 'meditation' && (
        <div className="flex flex-col items-center justify-center py-10 space-y-12 animate-in fade-in duration-700">
          <div className="relative">
            <div className={cn(
              "text-7xl font-black tracking-tighter tabular-nums transition-colors duration-500",
              seconds >= BASELINE_SECONDS ? "text-purple-600" : "text-gray-900"
            )}>
              {formatTime(seconds)}
            </div>
            {seconds >= BASELINE_SECONDS && (
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-widest text-purple-500 animate-bounce">
                Bonus Time
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <button 
              onClick={toggleTimer}
              className={cn(
                "w-20 h-20 rounded-3xl flex items-center justify-center transition-all active:scale-90",
                timerActive ? "bg-gray-100 text-gray-400" : "bg-purple-600 text-white shadow-lg shadow-purple-200"
              )}
            >
              {timerActive ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
            </button>
            
            {seconds > 0 && (
              <button 
                onClick={finishMeditation}
                className="w-20 h-20 bg-gray-900 text-white rounded-3xl flex items-center justify-center active:scale-90 transition-all shadow-xl"
              >
                <Check size={28} strokeWidth={3} />
              </button>
            )}
          </div>

          <div className="text-center space-y-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
              {seconds < BASELINE_SECONDS ? `Goal: ${formatTime(BASELINE_SECONDS)}` : 'Capacity Building Mode'}
            </p>
            <div className="w-48 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div 
                className="h-full bg-purple-600 transition-all duration-500" 
                style={{ width: `${Math.min((seconds / BASELINE_SECONDS) * 100, 100)}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {phase === 'journaling' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-700 text-left">
          <div className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Morning Log</h2>
            <textarea
              autoFocus
              value={journalEntry}
              onChange={(e) => setJournalEntry(e.target.value)}
              placeholder="Journal, reframe, or log wins..."
              className="w-full p-6 rounded-[2.5rem] bg-gray-50 border-none focus:ring-2 focus:ring-purple-600 font-bold h-48 resize-none text-sm leading-relaxed"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-black uppercase tracking-widest text-purple-600">Subjective Yield</label>
              <span className="text-xl font-black text-gray-900">{subjectiveYield}</span>
            </div>
            <input 
              type="range"
              min="1"
              max="4"
              step="1"
              value={subjectiveYield}
              onChange={(e) => setSubjectiveYield(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between px-1">
              {['Drain', 'Neutral', 'Yield', 'Fluid'].map((label, i) => (
                <span key={i} className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">{label}</span>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Validation</h2>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={() => setValidations(v => ({ ...v, sentToKat: !v.sentToKat }))}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                  validations.sentToKat ? "bg-red-50 border-red-200 text-red-600" : "bg-white border-gray-100 text-gray-400"
                )}
              >
                <Heart size={14} className={validations.sentToKat ? "fill-current" : ""} />
                Sent to Kat
              </button>
              <button 
                onClick={() => setValidations(v => ({ ...v, sentToFamily: !v.sentToFamily }))}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                  validations.sentToFamily ? "bg-blue-50 border-blue-200 text-blue-600" : "bg-white border-gray-100 text-gray-400"
                )}
              >
                <Users size={14} />
                Sent to Family
              </button>
              <button 
                onClick={() => setValidations(v => ({ ...v, sharedWin: !v.sharedWin }))}
                className={cn(
                  "flex items-center gap-2 px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all",
                  validations.sharedWin ? "bg-purple-50 border-purple-200 text-purple-600" : "bg-white border-gray-100 text-gray-400"
                )}
              >
                <Share2 size={14} />
                Shared Win
              </button>
            </div>
          </div>

          <button 
            onClick={submitMorningLog}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm active:scale-95 transition-all shadow-xl"
          >
            The Commit
          </button>
        </div>
      )}

      {phase === 'complete' && (
        <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in zoom-in-95 duration-700">
          <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center border border-green-100 shadow-inner">
            <Check size={40} className="text-green-600" strokeWidth={3} />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black text-gray-900">Activation Complete</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Recovery Instance logged. Have a fluid day.</p>
          </div>
          <button 
            onClick={() => window.location.reload()} // Quick way to reset or set state
            className="w-full max-w-xs py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm active:scale-95 transition-all"
          >
            Back to Dashboard
          </button>
        </div>
      )}
    </div>
  );
};
