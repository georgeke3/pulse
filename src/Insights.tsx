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

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type TimeRange = 'W' | 'M' | 'Y' | 'All';

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

      {/* Section 1: Daily Pillars */}
      <section className="space-y-6">
        <div className="space-y-1">
          <h2 className="text-xs font-black uppercase tracking-widest text-gray-400">Daily Matrix Trends</h2>
          <div className="flex flex-wrap gap-2">
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
      <section className="space-y-6">
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
            {[1, 2, 3, 4].map(v => (
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
