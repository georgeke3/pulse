import { useState, useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import { 
  format, subDays, startOfDay, eachDayOfInterval, parseISO 
} from 'date-fns';
import { useApp } from './store';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Sparkles, Loader2, AlertCircle, History, Clock, X, Trash2 } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TimeRange = 'W' | 'M' | 'Y' | 'All';

const CoachingHistoryModal = ({ onClose }: { onClose: () => void }) => {
  const { state, deleteCoachingReport } = useApp();
  
  return (
    <div className="fixed inset-0 bg-gray-900/60 flex items-end sm:items-center justify-center z-50 p-4 backdrop-blur-md text-gray-900 text-left">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] flex flex-col max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-500 relative">
        <div className="flex justify-between items-center p-7 pb-4 bg-white z-10 border-b border-gray-50">
          <h2 className="text-xl font-black tracking-tight">Coaching History</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-400 active:scale-90 transition-transform">
            <X size={16} strokeWidth={3}/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-7 pt-4 space-y-6">
          {state.coachingHistory.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto text-gray-200 mb-4" size={48} />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No history yet</p>
            </div>
          ) : (
            state.coachingHistory.map(report => (
              <div key={report.id} className="p-6 rounded-3xl bg-gray-50 border border-gray-100 space-y-4 group">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">
                    {format(parseISO(report.date), 'MMM d, h:mm a')}
                  </span>
                  <button 
                    onClick={() => deleteCoachingReport(report.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="space-y-3">
                  {report.content.split('\n').filter(p => p.trim()).map((p, i) => (
                    <p key={i} className="text-gray-700 text-xs font-medium leading-relaxed italic">
                      {p}
                    </p>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

import { GoogleGenerativeAI } from "@google/generative-ai";

const AICoach = () => {
  const { state, saveCoachingReport } = useApp();
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const generateInsight = async () => {
    if (!state.geminiKey) {
      setError("Please add your Gemini API Key in Settings (Calendar tab) first.");
      return;
    }

    setLoading(true);
    setError(null);

    const end = new Date();
    const start = subDays(end, 13);
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
          note: e.notes
        }))
      };
    }).filter(d => d !== null);

    const prompt = `
      You are an elite, objective performance coach. Analyze the following CNS load and resilience data from the past 14 days.
      Data includes objective/subjective logs, daily notes, and mottos.
      
      DATA:
      ${JSON.stringify(contextData, null, 2)}
      
      INSTRUCTIONS:
      1. Be brutal, objective, and concise. 
      2. Provide exactly 2 paragraphs.
      3. Paragraph 1: Identify the primary "friction point" or failure in the process right now. Mention specific text notes or mottos if they show a trend of burnout or boundary failure.
      4. Paragraph 2: Provide a specific, actionable adjustment to the "Training" or "Recovery" protocol for the next 48 hours.
    `;

    try {
      const genAI = new GoogleGenerativeAI(state.geminiKey);
      // Using gemini-1.5-flash which is the fastest/cheapest for this task
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      if (!text) throw new Error("No response from AI.");
      
      setInsight(text);
      saveCoachingReport(text, contextData);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to connect to Gemini API. Check your key and internet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">AI Performance Coach</h2>
        <button 
          onClick={() => setIsHistoryOpen(true)}
          className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
        >
          <History size={16} />
        </button>
      </div>

      <div className="bg-gray-900 rounded-[2.5rem] p-8 space-y-6 shadow-2xl border border-gray-800">
        {!insight && !loading && (
          <div className="space-y-4 text-center">
            <p className="text-xs font-bold text-gray-400 leading-relaxed">
              Analyze the last 14 days of CNS load, patterns, and notes.
            </p>
            <button
              onClick={generateInsight}
              className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-sm active:scale-95 transition-all shadow-lg"
            >
              <Sparkles size={14} className="inline mr-2" />
              Analyze Week
            </button>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="text-purple-500 animate-spin" size={32} />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Reading text entries & patterns...</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 bg-red-950/30 p-4 rounded-2xl border border-red-900/50">
            <AlertCircle className="text-red-500 shrink-0" size={16} />
            <p className="text-[10px] font-bold text-red-200 leading-relaxed">{error}</p>
          </div>
        )}

        {insight && !loading && (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="space-y-4 text-left">
              {insight.split('\n').filter(p => p.trim()).map((p, i) => (
                <p key={i} className="text-gray-200 text-sm font-medium leading-relaxed">
                  {p}
                </p>
              ))}
            </div>
            <button
              onClick={() => setInsight(null)}
              className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
            >
              Reset Report
            </button>
          </div>
        )}
      </div>

      {isHistoryOpen && <CoachingHistoryModal onClose={() => setIsHistoryOpen(false)} />}
    </section>
  );
};

export const InsightsView = () => {
  const { state } = useApp();
  const [range, setTimeRange] = useState<TimeRange>('W');
  
  // 1. Daily Metrics State
  const [activeMetric, setActiveMetric] = useState(state.config.daily_questions[0].id);
  
  // 2. Gap State
  const [gapType, setGapType] = useState<'training' | 'recovery'>('training');
  const [objFilter, setObjFilter] = useState<number | null>(null);

  const dateRange = useMemo(() => {
    const end = startOfDay(new Date());
    let start;
    if (range === 'W') start = subDays(end, 6);
    else if (range === 'M') start = subDays(end, 29);
    else if (range === 'Y') start = subDays(end, 364);
    else {
      const dates = Object.keys(state.days).sort();
      start = dates.length ? parseISO(dates[0]) : subDays(end, 6);
    }
    return eachDayOfInterval({ start, end });
  }, [range, state.days]);

  // --- DATA 1: Daily Questions ---
  const metricData = useMemo(() => {
    return dateRange.map(date => {
      const dStr = format(date, 'yyyy-MM-dd');
      return {
        date: format(date, 'MMM d'),
        value: state.days[dStr]?.answers[activeMetric] || null
      };
    });
  }, [dateRange, activeMetric, state.days]);

  const metricStats = useMemo(() => {
    const vals = metricData.map(d => d.value).filter((v): v is number => v !== null);
    if (!vals.length) return { avg: 0, trend: 'Flat' };
    const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
    const first = vals[0];
    const last = vals[vals.length - 1];
    const trend = last > first ? 'Improving' : last < first ? 'Declining' : 'Stable';
    return { avg: avg.toFixed(1), trend };
  }, [metricData]);

  // --- DATA 2: Obj vs Sub Gap ---
  const gapData = useMemo(() => {
    return dateRange.map(date => {
      const dStr = format(date, 'yyyy-MM-dd');
      const dayEvents = state.days[dStr]?.events || [];
      const filtered = dayEvents.filter(e => {
        const typeMatch = e.type === gapType;
        const filterMatch = objFilter === null || e.objectiveIntensity === objFilter;
        return typeMatch && filterMatch;
      });

      if (!filtered.length) return { date: format(date, 'MMM d'), obj: null, sub: null, gap: null };

      const avgObj = filtered.reduce((a, b) => a + b.objectiveIntensity, 0) / filtered.length;
      const avgSub = filtered.reduce((a, b) => a + (b.intensity || 0), 0) / filtered.length;
      
      return {
        date: format(date, 'MMM d'),
        obj: avgObj.toFixed(1),
        sub: avgSub.toFixed(1),
        gap: (avgObj - (avgSub * 2.5)).toFixed(1) // Normalized gap since scales differ (10 vs 4)
      };
    });
  }, [dateRange, gapType, objFilter, state.days]);

  const gapStats = useMemo(() => {
    const valid = gapData.filter(d => d.obj !== null);
    if (!valid.length) return { avgObj: 0, avgSub: 0 };
    const avgObj = valid.reduce((a, b) => a + parseFloat(b.obj as string), 0) / valid.length;
    const avgSub = valid.reduce((a, b) => a + parseFloat(b.sub as string), 0) / valid.length;
    return { avgObj: avgObj.toFixed(1), avgSub: avgSub.toFixed(1) };
  }, [gapData]);

  return (
    <div className="p-6 space-y-12 pb-32 bg-white min-h-screen text-gray-900">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-black tracking-tight">Insights</h1>
        <div className="flex bg-gray-100 p-1 rounded-xl">
          {(['W', 'M', 'Y', 'All'] as TimeRange[]).map(t => (
            <button
              key={t}
              onClick={() => setTimeRange(t)}
              className={cn(
                "px-3 py-1 text-[10px] font-black rounded-lg transition-all",
                range === t ? "bg-white text-purple-600 shadow-sm" : "text-gray-400"
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </header>

      <AICoach />

      {/* Section 1: Daily Pillars */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Daily Matrix Trends</h2>
          <div className="flex flex-wrap gap-2 text-left">
            {state.config.daily_questions.map(q => (
              <button
                key={q.id}
                onClick={() => setActiveMetric(q.id)}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-tighter border-2 transition-all",
                  activeMetric === q.id ? "bg-purple-600 border-purple-600 text-white" : "bg-white border-gray-100 text-gray-400"
                )}
              >
                {q.prompt.split('(')[0].split('.')[1].trim()}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <div className="text-2xl font-black text-gray-900">{metricStats.avg}</div>
              <div className="text-[10px] font-black uppercase text-gray-400">Average Score</div>
            </div>
            <div className="text-right">
              <div className={cn(
                "text-xs font-black uppercase",
                metricStats.trend === 'Improving' ? "text-green-500" : metricStats.trend === 'Declining' ? "text-red-500" : "text-gray-400"
              )}>
                {metricStats.trend}
              </div>
              <div className="text-[10px] font-black uppercase text-gray-400">Trend</div>
            </div>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={metricData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#cbd5e1' }}
                  interval={range === 'W' ? 0 : 'preserveStartEnd'}
                />
                <YAxis domain={[1, 4]} hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 900, fontSize: '12px' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#9333ea" 
                  strokeWidth={4} 
                  dot={{ r: 4, fill: '#9333ea', strokeWidth: 0 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>

      {/* Section 2: Obj vs Sub Gap */}
      <section className="space-y-6 text-left">
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Perception Gap</h2>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setGapType('training')}
                className={cn(
                  "px-3 py-1 text-[10px] font-black rounded-lg transition-all",
                  gapType === 'training' ? "bg-white text-red-600 shadow-sm" : "text-gray-400"
                )}
              >
                Training
              </button>
              <button
                onClick={() => setGapType('recovery')}
                className={cn(
                  "px-3 py-1 text-[10px] font-black rounded-lg transition-all",
                  gapType === 'recovery' ? "bg-white text-green-600 shadow-sm" : "text-gray-400"
                )}
              >
                Recovery
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase text-gray-400 mr-2">Filter Obj:</span>
            {[1, 2, 3, 4, 5].map(v => (
              <button
                key={v}
                onClick={() => setObjFilter(objFilter === v ? null : v)}
                className={cn(
                  "w-8 h-8 rounded-lg text-xs font-black border-2 transition-all",
                  objFilter === v ? "bg-gray-900 border-gray-900 text-white" : "bg-white border-gray-100 text-gray-400"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-gray-50 p-6 rounded-[2.5rem] border border-gray-100 space-y-6">
          <div className="flex justify-between">
            <div>
              <div className="text-xl font-black text-gray-900">{gapStats.avgObj}</div>
              <div className="text-[9px] font-black uppercase text-gray-400 italic">Avg Objective (1-10)</div>
            </div>
            <div className="text-right">
              <div className={cn("text-xl font-black", gapType === 'training' ? "text-red-600" : "text-green-600")}>
                {gapStats.avgSub}
              </div>
              <div className="text-[9px] font-black uppercase text-gray-400 italic">Avg Subjective (1-4)</div>
            </div>
          </div>

          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gapData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis 
                  dataKey="date" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 9, fontWeight: 900, fill: '#cbd5e1' }}
                  interval={range === 'W' ? 0 : 'preserveStartEnd'}
                />
                <YAxis hide />
                <Tooltip 
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 900 }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '10px', fontWeight: 900, paddingTop: '10px' }} />
                <Bar dataKey="obj" name="Objective" fill="#111827" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sub" name="Subjective" fill={gapType === 'training' ? '#ef4444' : '#22c55e'} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[9px] font-bold text-gray-400 leading-relaxed text-center italic">
            This graph tracks the delta between the absolute complexity of events (Objective) and your perceived mental cost (Subjective).
          </p>
        </div>
      </section>
    </div>
  );
};
