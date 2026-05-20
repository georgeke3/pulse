import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { Check, X, RotateCcw, Undo2, Zap, Play, Square } from 'lucide-react';
import { useApp } from './store';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Phase = 'init' | 'active' | 'journaling' | 'complete';

export const FocusView = ({ onBack }: { onBack: () => void }) => {
  const { addEvent } = useApp();
  const [phase, setPhase] = useState<Phase>('init');
  const [seconds, setSeconds] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const timerRef = useRef<any>(null);
  const startTimeRef = useRef<number | null>(null);
  const wakeLockRef = useRef<any>(null);

  // Drawing State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<string[]>([]); // Data URLs for undo

  // Journaling State
  const [notes, setNotes] = useState('');
  const [subjectiveYield, setSubjectiveYield] = useState(2);

  // High-DPI Canvas Scaling
  useEffect(() => {
    if (phase === 'active' && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      
      // If we had history, redraw last frame
      if (history.length > 0) {
        const img = new Image();
        img.src = history[history.length - 1];
        img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      }
    }
  }, [phase]);

  // Wake Lock
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err: any) {
      console.error("WakeLock error:", err);
    }
  };

  const releaseWakeLock = async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
    }
  };

  const startFocus = async () => {
    setPhase('active');
    setTimerActive(true);
    await requestWakeLock();
    startTimeRef.current = Date.now();
    const initialSeconds = seconds;
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - (startTimeRef.current || 0)) / 1000);
      setSeconds(initialSeconds + elapsed);
    }, 1000);
  };

  const pauseFocus = async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setTimerActive(false);
    await releaseWakeLock();
  };

  const endFocus = async () => {
    await pauseFocus();
    setPhase('journaling');
  };

  const submitFocus = () => {
    const durationMins = Math.floor(seconds / 60);
    let objectiveIntensity = 1;
    if (durationMins >= 20) objectiveIntensity = 3;
    else if (durationMins >= 10) objectiveIntensity = 2;

    addEvent(format(new Date(), 'yyyy-MM-dd'), {
      type: 'recovery',
      category: 'Focus Time',
      intensity: subjectiveYield,
      objectiveIntensity,
      duration: seconds < 3600 ? '<1h' : 'couple hours',
      custom_data: { focus_seconds: seconds },
      notes: notes,
      date: format(new Date(), 'yyyy-MM-dd'),
      isExpected: false
    });
    setPhase('complete');
  };

  // --- Drawing Logic ---
  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      setHistory(prev => [...prev, canvas.toDataURL()]);
    }
  };

  const undo = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx || history.length === 0) return;

    const newHistory = [...history];
    newHistory.pop(); // Remove current
    setHistory(newHistory);

    const rect = canvas.getBoundingClientRect();
    ctx.clearRect(0, 0, rect.width, rect.height);
    if (newHistory.length > 0) {
      const img = new Image();
      img.src = newHistory[newHistory.length - 1];
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
    }
  };

  const clearCanvas = () => {
    if (!confirm('Clear entire sketch?')) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      const rect = canvas.getBoundingClientRect();
      ctx.clearRect(0, 0, rect.width, rect.height);
      setHistory([]);
    }
  };

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: any) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#111827';
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx) return;

    const { x, y } = getCoordinates(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      saveToHistory();
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col fixed inset-0 bg-white text-gray-900 z-[100] overflow-hidden">
      <header className="p-6 flex justify-between items-start bg-white z-10 border-b border-gray-50">
        <div>
          <h1 className="text-3xl font-black tracking-tight mb-1">Focus</h1>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-purple-600 uppercase">Deep Work Sketch</p>
        </div>
        <button onClick={onBack} className="p-2 bg-gray-50 rounded-xl text-gray-400 active:scale-90 transition-all">
          <X size={20} strokeWidth={3} />
        </button>
      </header>

      {phase === 'init' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-in fade-in duration-700">
          <div className="w-24 h-24 rounded-full bg-gray-900 flex items-center justify-center border border-gray-800 shadow-xl">
            <Zap size={40} className="text-white" fill="white" />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black">Enter Focus Block</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-relaxed">Time your work and doodle freely.</p>
          </div>
          <button 
            onClick={startFocus}
            className="w-full max-w-xs py-4 bg-gray-900 text-white rounded-2xl font-black text-sm active:scale-95 transition-all shadow-xl"
          >
            Start Timer
          </button>
        </div>
      )}

      {phase === 'active' && (
        <div className="flex-1 flex flex-col relative overflow-hidden">
          {/* Smaller Timer Overlay */}
          <div className="absolute top-4 left-6 z-10 flex flex-col items-start pointer-events-none">
            <div className="text-4xl font-black tracking-tighter tabular-nums text-gray-900 bg-white/50 backdrop-blur-sm px-3 py-1 rounded-xl">
              {formatTime(seconds)}
            </div>
            <div className="text-[8px] font-black uppercase tracking-widest text-purple-500 mt-1 ml-1 bg-white/50 backdrop-blur-sm px-2 py-0.5 rounded-full">
              {timerActive ? 'Live Focus' : 'Paused'}
            </div>
          </div>

          {/* Controls Overlay */}
          <div className="absolute top-4 right-6 z-10 flex gap-2">
            <button onClick={undo} className="p-3 bg-white/80 backdrop-blur-md border border-gray-100 rounded-xl shadow-lg active:scale-90 text-gray-400">
              <Undo2 size={18} strokeWidth={3} />
            </button>
            <button onClick={clearCanvas} className="p-3 bg-white/80 backdrop-blur-md border border-gray-100 rounded-xl shadow-lg active:scale-90 text-gray-400">
              <RotateCcw size={18} strokeWidth={3} />
            </button>
          </div>

          {/* Draw Pad */}
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="flex-1 bg-gray-50/50 touch-none w-full h-full"
          />

          {/* End Button Container - Ensures overlap with nav doesn't happen */}
          <div className="p-6 bg-white border-t border-gray-100 flex justify-center gap-4 z-20 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)]">
            <button 
              onClick={() => timerActive ? pauseFocus() : startFocus()}
              className={cn(
                "w-20 h-14 rounded-2xl flex items-center justify-center transition-all active:scale-90",
                timerActive ? "bg-gray-100 text-gray-400" : "bg-purple-600 text-white shadow-lg shadow-purple-200"
              )}
            >
              {timerActive ? <Square size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
            </button>
            <button 
              onClick={endFocus}
              className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black text-sm active:scale-95 transition-all shadow-xl flex items-center justify-center gap-2"
            >
              <Check size={20} strokeWidth={3} />
              Finish Block
            </button>
          </div>
        </div>
      )}

      {phase === 'journaling' && (
        <div className="flex-1 p-6 space-y-8 animate-in slide-in-from-bottom-4 duration-700 text-left overflow-y-auto">
          <div className="space-y-4">
            <h2 className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-400">Focus Notes</h2>
            <textarea
              autoFocus
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="What did you achieve? Context..."
              className="w-full p-6 rounded-[2.5rem] bg-gray-50 border-none focus:ring-2 focus:ring-purple-600 font-bold h-48 resize-none text-sm leading-relaxed"
            />
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-end">
              <label className="text-[10px] font-black uppercase tracking-widest text-purple-600">Focus Yield</label>
              <span className="text-xl font-black text-gray-900">{subjectiveYield}</span>
            </div>
            <input 
              type="range"
              min="0"
              max="4"
              step="1"
              value={subjectiveYield}
              onChange={(e) => setSubjectiveYield(parseInt(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
            />
            <div className="flex justify-between px-1">
              {['Drain', 'Low', 'Maint.', 'High', 'Elite'].map((label, i) => (
                <span key={i} className="text-[8px] font-black text-gray-400 uppercase tracking-tighter">{label}</span>
              ))}
            </div>
          </div>

          <button 
            onClick={submitFocus}
            className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm active:scale-95 transition-all shadow-xl"
          >
            The Commit
          </button>
        </div>
      )}

      {phase === 'complete' && (
        <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-8 animate-in zoom-in-95 duration-700">
          <div className="w-24 h-24 rounded-full bg-green-50 flex items-center justify-center border border-green-100 shadow-inner">
            <Check size={40} className="text-green-600" strokeWidth={3} />
          </div>
          <div className="text-center space-y-2">
            <h2 className="text-xl font-black text-gray-900">Focus Captured</h2>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Instance logged. System aligned.</p>
          </div>
          <button 
            onClick={onBack}
            className="w-full max-w-xs py-4 bg-gray-100 text-gray-600 rounded-2xl font-black text-sm active:scale-95 transition-all"
          >
            Return Home
          </button>
        </div>
      )}
    </div>
  );
};
