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
import { GoogleGenerativeAI } from "@google/generative-ai";
import type { TruthUtility } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TimeRange = 'W' | 'M' | 'Y' | 'All';

const TRUTH_UTILITY_OPTS: TruthUtility[] = ['Bullseye', 'Over-Indexed', 'Hallucination', 'Unrealistic'];

const ReportFeedback = ({ reportId, initialFeedback, initialTruth }: { 
  reportId: string, 
  initialFeedback?: string, 
  initialTruth?: TruthUtility 
}) => {
  const { updateCoachingReport } = useApp();
  const [text, setText] = useState(initialFeedback || '');
  const [truth, setTruth] = useState<TruthUtility | undefined>(initialTruth);
  const [saved, setSaved] = useState(false);

  const save = () => {
    updateCoachingReport(reportId, { feedback: text, truthUtility: truth });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-4 pt-4 border-t border-gray-800">
      <div className="space-y-2 text-left">
        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Truth & Utility Scale</label>
        <div className="grid grid-cols-2 gap-2">
          {TRUTH_UTILITY_OPTS.map(opt => (
            <button
              key={opt}
              onClick={() => { setTruth(opt); updateCoachingReport(reportId, { truthUtility: opt }); }}
              className={cn(
                "py-2 px-3 rounded-xl text-[8px] font-black uppercase tracking-widest border-2 transition-all",
                truth === opt ? "bg-purple-600 border-purple-600 text-white" : "bg-transparent border-gray-800 text-gray-500 hover:border-gray-700"
              )}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2 text-left">
        <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Raw Thoughts</label>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What did you think of this advice?"
          className="w-full p-4 rounded-2xl bg-gray-800/50 border-none focus:ring-2 focus:ring-purple-600 font-bold text-[10px] text-gray-300 h-20 resize-none"
        />
      </div>

      <button
        onClick={save}
        className={cn(
          "w-full py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
          saved ? "bg-green-600 text-white" : "bg-gray-800 text-gray-400 hover:text-white"
        )}
      >
        {saved ? 'Feedback Saved' : 'Save Feedback'}
      </button>
    </div>
  );
};

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

        <div className="flex-1 overflow-y-auto p-7 pt-4 space-y-6 text-left">
          {state.coachingHistory.length === 0 ? (
            <div className="text-center py-12">
              <Clock className="mx-auto text-gray-200 mb-4" size={48} />
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">No history yet</p>
            </div>
          ) : (
            state.coachingHistory.map(report => (
              <div key={report.id} className="p-6 rounded-3xl bg-gray-50 border border-gray-100 space-y-4 group">
                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">
                      {format(parseISO(report.date), 'MMM d, h:mm a')}
                    </span>
                    {report.mode && (
                      <span className="text-[7px] font-black text-gray-400 uppercase tracking-[0.2em] mt-0.5">{report.mode} Analysis</span>
                    )}
                  </div>
                  <button 
                    onClick={() => deleteCoachingReport(report.id)}
                    className="text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="space-y-3">
                  {report.content.split('\n').filter(p => p.trim()).map((p, i) => (
                    <p key={i} className="text-gray-700 text-[11px] font-medium leading-relaxed italic">
                      {p}
                    </p>
                  ))}
                </div>
                
                <div className="bg-white/50 p-4 rounded-2xl space-y-4">
                  <h4 className="text-[8px] font-black uppercase tracking-widest text-gray-400">Feedback</h4>
                  <ReportFeedback 
                    reportId={report.id} 
                    initialFeedback={report.feedback} 
                    initialTruth={report.truthUtility}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

const AICoach = () => {
  const { state, saveCoachingReport, deleteCoachingReport } = useApp();
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState<string | null>(null);
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [mode, setMode] = useState<'Standard' | 'Action Plan' | 'Philosophical'>('Standard');

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
          note: e.notes,
          isExpected: e.isExpected
        }))
      };
    }).filter(d => d !== null);

    // Get past feedback to help Gemini learn
    const pastReports = state.coachingHistory.slice(0, 3).map(r => ({
      date: r.date,
      coaching: r.content,
      user_feedback: r.feedback,
      rating: r.truthUtility
    }));

    let modeInstructions = '';
    if (mode === 'Standard') {
      modeInstructions = `
        1. Be brutal, objective, and concise. 
        2. Provide exactly 2 paragraphs.
        3. Paragraph 1: Identify the primary "friction point" or failure in the process right now. Mention specific text notes or mottos if they show a trend of burnout or boundary failure.
        4. Paragraph 2: Provide a specific, actionable adjustment to the "Training" or "Recovery" protocol for the next 48 hours.
      `;
    } else if (mode === 'Action Plan') {
      modeInstructions = `
        1. Provide a tactical, step-by-step 48-hour action plan.
        2. Focus on specific sequence and timing.
        3. Use bullet points for the plan.
        4. Be extremely directive.
      `;
    } else if (mode === 'Philosophical') {
      modeInstructions = `
        1. Provide a 3rd person grounding perspective and philosophical assessment.
        2. Avoid adding strict regimens or "more work".
        3. Focus on positivity, grounding arguments, and self-compassion.
        4. Use an encouraging, wise, and calm tone.
        5. Explain the "why" behind their current state from a biological and psychological perspective without being critical.
      `;
    }

    const prompt = `
      You are an elite, objective performance coach. Analyze the following CNS load and resilience data from the past 14 days.
      Data includes objective/subjective logs, daily notes, and mottos.
      
      USER PROFILE (PERSONA):
      ${state.systemPrompt || 'No specific profile provided.'}

      CURRENT DATA:
      ${JSON.stringify(contextData, null, 2)}
      
      PAST COACHING & USER FEEDBACK (Use this to avoid hallucinations or unrealistic advice):
      ${JSON.stringify(pastReports, null, 2)}
      
      ANALYSIS MODE: ${mode}

      INSTRUCTIONS:
      ${modeInstructions}
      5. Adjust your tone and advice based on past user feedback (e.g., if the user said previous advice was "Unrealistic", try a more feasible protocol).
    `;

    try {
      const genAI = new GoogleGenerativeAI(state.geminiKey);
      const model = genAI.getGenerativeModel(
        { model: "gemini-flash-latest" },
        { apiVersion: 'v1beta' }
      );

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      if (!text) throw new Error("No response from AI.");
      
      const id = saveCoachingReport(text, contextData, mode);
      setInsight(text);
      setCurrentReportId(id);
    } catch (e: any) {
      console.error(e);
      setError(e.message || "Failed to connect to Gemini API. Check your key and internet.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="space-y-4 text-left">
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
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Analysis Mode</label>
              <div className="flex flex-wrap gap-2">
                {(['Standard', 'Action Plan', 'Philosophical'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={cn(
                      "flex-1 py-2 px-3 rounded-xl text-[8px] font-black uppercase tracking-widest border-2 transition-all min-w-fit whitespace-nowrap",
                      mode === m ? "bg-purple-600 border-purple-600 text-white" : "bg-transparent border-gray-800 text-gray-500 hover:border-gray-700"
                    )}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 text-center">
              <p className="text-xs font-bold text-gray-400 leading-relaxed">
                {mode === 'Standard' && "Identify friction points and get a quick adjustment."}
                {mode === 'Action Plan' && "Get a detailed 48-hour tactical roadmap."}
                {mode === 'Philosophical' && "Perspective, grounding, and biological context."}
              </p>
              <button
                onClick={generateInsight}
                className="w-full py-4 bg-purple-600 text-white rounded-2xl font-black text-sm active:scale-95 transition-all shadow-lg"
              >
                <Sparkles size={14} className="inline mr-2" />
                Analyze Week
              </button>
            </div>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="text-purple-500 animate-spin" size={32} />
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 text-center">Reading text entries & patterns...</p>
          </div>
        )}

        {error && (
          <div className="flex items-start gap-3 bg-red-950/30 p-4 rounded-2xl border border-red-900/50 text-left">
            <AlertCircle className="text-red-500 shrink-0" size={16} />
            <p className="text-[10px] font-bold text-red-200 leading-relaxed">{error}</p>
          </div>
        )}

        {insight && !loading && (
          <div className="space-y-6 animate-in fade-in duration-700">
            <div className="flex justify-between items-start">
              <div className="space-y-4 text-left flex-1">
                {insight.split('\n').filter(p => p.trim()).map((p, i) => (
                  <p key={i} className="text-gray-200 text-sm font-medium leading-relaxed">
                    {p}
                  </p>
                ))}
              </div>
              {currentReportId && (
                <button 
                  onClick={() => {
                    if (confirm('Delete this analysis?')) {
                      deleteCoachingReport(currentReportId);
                      setInsight(null);
                      setCurrentReportId(null);
                    }
                  }}
                  className="p-2 text-gray-700 hover:text-red-500 transition-colors ml-4"
                  title="Delete this analysis"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            {currentReportId && (
              <div className="space-y-4 border-t border-gray-800 pt-6">
                <h3 className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-400">Your Evaluation</h3>
                <ReportFeedback reportId={currentReportId} />
              </div>
            )}

            <button
              onClick={() => { setInsight(null); setCurrentReportId(null); }}
              className="text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-white transition-colors"
            >
              Close Report
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
    const question = state.config.daily_questions.find(q => q.id === activeMetric);
    return dateRange.map(date => {
      const dStr = format(date, 'yyyy-MM-dd');
      const val = state.days[dStr]?.answers[activeMetric] || null;
      const label = question?.options.find(o => o.value === val)?.label || '';
      return {
        date: format(date, 'MMM d'),
        value: val,
        label: label
      };
    });
  }, [dateRange, activeMetric, state.days, state.config.daily_questions]);

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
                  formatter={(value: any, _name: any, props: any) => {
                    return [props.payload.label || value, 'State'];
                  }}
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

          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] font-black uppercase text-gray-400 mr-1">Filter Obj:</span>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(v => (
              <button
                key={v}
                onClick={() => setObjFilter(objFilter === v ? null : v)}
                className={cn(
                  "w-7 h-7 rounded-lg text-[10px] font-black border-2 transition-all",
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
