import { useState, useRef } from 'react';
import { 
  format, startOfMonth, endOfMonth, eachDayOfInterval, isToday, startOfWeek, endOfWeek, isSameMonth, addMonths, subMonths, addDays, subDays 
} from 'date-fns';
import { 
  Calendar as CalendarIcon, ClipboardList, Plus, ChevronLeft, ChevronRight, X,
  Briefcase, Heart, Users, UsersRound, Zap, CheckSquare, Wallet, 
  Footprints, Moon, Brain, Eye, Palette, Gamepad2, BookOpen, HelpCircle, 
  Library, Edit2, Check
} from 'lucide-react';
import { useApp } from './store';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Event, Duration } from './types';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORY_ICONS: Record<string, any> = {
  // Training
  "Work": Briefcase,
  "Nucleus": Heart,
  "Family": Users,
  "Friends": UsersRound,
  "Chaos": Zap,
  "Baseline": CheckSquare,
  "Finances": Wallet,
  // Recovery
  "Walk": Footprints,
  "Nap": Moon,
  "Meditation": Brain,
  "Presence check": Eye,
  "Creative": Palette,
  "Fun": Gamepad2,
  "Journaling": BookOpen,
};

const getIcon = (category: string) => {
  return CATEGORY_ICONS[category] || HelpCircle;
};

// --- Components ---

const CalendarView = ({ onSelectDate }: { onSelectDate: (date: Date) => void }) => {
  const { getBanisterScore } = useApp();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const touchStart = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const distance = e.changedTouches[0].clientX - touchStart.current;
    if (distance > 100) setCurrentMonth(subMonths(currentMonth, 1));
    if (distance < -100) setCurrentMonth(addMonths(currentMonth, 1));
    touchStart.current = null;
  };
  
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart);
  const calendarEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  return (
    <div 
      className="p-6 bg-white min-h-screen"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Pulse</h1>
          <div className="flex items-center gap-2">
            <p className="text-gray-500 font-medium">{format(currentMonth, 'MMMM yyyy')}</p>
            {!isSameMonth(currentMonth, new Date()) && (
              <button 
                onClick={goToToday}
                className="text-[10px] font-black uppercase tracking-widest text-purple-600 bg-purple-50 px-2 py-1 rounded-md"
              >
                Today
              </button>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 bg-gray-50 rounded-xl active:scale-90 transition-all"><ChevronLeft size={20}/></button>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 bg-gray-50 rounded-xl active:scale-90 transition-all"><ChevronRight size={20}/></button>
        </div>
      </header>

      <div className="grid grid-cols-7 gap-y-4 gap-x-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map(d => (
          <div key={d} className="text-center text-[10px] font-black text-gray-400 uppercase tracking-widest pb-2">{d}</div>
        ))}
        {days.map(day => {
          const score = getBanisterScore(day);
          const isCurrentMonth = isSameMonth(day, currentMonth);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelectDate(day)}
              className={cn(
                "aspect-square rounded-2xl flex flex-col items-center justify-center relative transition-all active:scale-90",
                !isCurrentMonth && "opacity-20",
                isToday(day) ? "bg-purple-600 text-white shadow-lg shadow-purple-200" : "bg-gray-50 text-gray-900"
              )}
            >
              <span className={cn("text-sm font-bold", isToday(day) ? "text-white" : "text-gray-900")}>
                {format(day, 'd')}
              </span>
              <div className={cn(
                "w-1.5 h-1.5 rounded-full mt-1.5",
                score > 0 ? "bg-green-400" : score < 0 ? "bg-red-400" : "bg-transparent"
              )} />
            </button>
          );
        })}
      </div>

      <div className="mt-12 p-6 rounded-3xl bg-gray-50 border border-gray-100">
        <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Mental Bank Readiness</h3>
        <div className="flex justify-between items-end">
          <div>
            <div className="text-4xl font-black text-gray-900">{getBanisterScore(new Date())}</div>
            <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 mt-1">Status: {getBanisterScore(new Date()) >= 0 ? 'Resilient' : 'Brittle'}</div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-black text-purple-600 uppercase tracking-widest">7-Day Rolling</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const DailyLedger = ({ date, onBack, onSelectDate }: { date: Date, onBack: () => void, onSelectDate: (d: Date) => void }) => {
  const { state, updateAnswers, addEvent, updateEvent, deleteEvent, updateDayNote, updateDayMotto, addMotto, getBanisterScore } = useApp();
  const dateStr = format(date, 'yyyy-MM-dd');
  const dayData = state.days[dateStr] || { events: [], answers: {}, note: '', motto: '' };
  const score = getBanisterScore(date);
  const [modalMode, setModalMode] = useState<{ open: boolean, event?: Event }>({ open: false });
  const [isMottoLibraryOpen, setIsMottoLibraryOpen] = useState(false);
  
  const [isPulseCollapsed, setIsPulseCollapsed] = useState(() => {
    return localStorage.getItem('pulse_collapsed') === 'true';
  });
  const [isNoteCollapsed, setIsNoteCollapsed] = useState(() => {
    return localStorage.getItem('note_collapsed') === 'true';
  });

  const touchStart = useRef<number | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStart.current) return;
    const touchEnd = e.changedTouches[0].clientX;
    const distance = touchEnd - touchStart.current;
    if (distance > 100) {
      onBack();
    }
    touchStart.current = null;
  };

  const togglePulse = () => {
    const newState = !isPulseCollapsed;
    setIsPulseCollapsed(newState);
    localStorage.setItem('pulse_collapsed', String(newState));
  };

  const toggleNote = () => {
    const newState = !isNoteCollapsed;
    setIsNoteCollapsed(newState);
    localStorage.setItem('note_collapsed', String(newState));
  };

  return (
    <div 
      className="flex flex-col h-full bg-white min-h-screen"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <header className="px-6 pt-8 pb-4 flex justify-between items-start bg-white">
        <div>
          <button onClick={onBack} className="text-xs font-black uppercase tracking-widest text-purple-600 mb-2 block">← Back</button>
          <div className="flex items-center gap-3">
            <button onClick={() => onSelectDate(subDays(date, 1))} className="text-gray-300 active:text-purple-600 transition-colors">
              <ChevronLeft size={24} strokeWidth={3}/>
            </button>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tight">{format(date, 'MMM d')}</h1>
              <p className="text-gray-500 font-bold">{format(date, 'EEEE')}</p>
            </div>
            <button onClick={() => onSelectDate(addDays(date, 1))} className="text-gray-300 active:text-purple-600 transition-colors">
              <ChevronRight size={24} strokeWidth={3}/>
            </button>
          </div>
        </div>
        <div className={cn(
          "text-4xl font-black rounded-3xl p-4 min-w-[80px] text-center",
          score > 0 ? "text-green-600 bg-green-50" : score < 0 ? "text-red-600 bg-red-50" : "text-gray-300 bg-gray-50"
        )}>
          {score > 0 ? `+${score}` : score}
        </div>
      </header>

      <main className="flex-1 px-6 space-y-6 pb-32">
        {/* Daily Motto */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Daily Motto</h2>
            <button 
              onClick={() => setIsMottoLibraryOpen(true)}
              className="text-[10px] font-black uppercase tracking-widest text-purple-600 flex items-center gap-1 bg-purple-50 px-2 py-1 rounded-md active:scale-95 transition-all"
            >
              <Library size={10}/>
              Library
            </button>
          </div>
          <div className="space-y-3">
            <input
              type="text"
              value={dayData.motto || ''}
              onChange={(e) => updateDayMotto(dateStr, e.target.value)}
              onBlur={() => {
                if (dayData.motto) addMotto(dayData.motto);
              }}
              placeholder="Focus of the day..."
              className="w-full p-5 rounded-3xl bg-gray-50 border-none focus:ring-2 focus:ring-purple-600 font-black text-sm transition-all"
            />
          </div>
        </section>

        {/* Pulse Metrics */}
        <section className="space-y-3">
          <button 
            onClick={togglePulse}
            className="flex justify-between items-center w-full group"
          >
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Daily Pulse</h2>
            <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">{isPulseCollapsed ? 'Expand +' : 'Collapse -'}</span>
          </button>
          
          {!isPulseCollapsed && (
            <div className="space-y-3 animate-in fade-in duration-300">
              {state.config.daily_questions.map(q => {
                const currentValue = dayData.answers[q.id] || 0;
                return (
                  <div key={q.id} className="bg-gray-50 p-4 rounded-3xl border border-gray-100 space-y-3">
                    <h3 className="text-[9px] font-black uppercase tracking-widest text-gray-400">{q.prompt}</h3>
                    <div className="grid grid-cols-4 gap-1.5">
                      {q.options.map(opt => (
                        <button
                          key={opt.value}
                          onClick={() => updateAnswers(dateStr, { [q.id]: opt.value })}
                          className={cn(
                            "flex flex-col items-center p-2 rounded-xl border-2 transition-all",
                            currentValue === opt.value ? "bg-purple-600 border-purple-600 text-white shadow-md" : "bg-white border-transparent text-gray-400"
                          )}
                        >
                          <span className="text-sm font-black">{opt.value}</span>
                          <span className="text-[7px] font-black uppercase tracking-tighter mt-0.5">{opt.label}</span>
                        </button>
                      ))}
                    </div>
                    {currentValue > 0 && q.options.find(o => o.value === currentValue)?.description && (
                      <div className="bg-purple-100/50 p-3 rounded-2xl animate-in fade-in slide-in-from-top-1 duration-300">
                        <p className="text-[9px] font-bold text-purple-700 leading-relaxed">
                          {q.options.find(o => o.value === currentValue)?.description}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Daily Note */}
        <section className="space-y-3">
          <button 
            onClick={toggleNote}
            className="flex justify-between items-center w-full group"
          >
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Daily Note</h2>
            <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">{isNoteCollapsed ? 'Expand +' : 'Collapse -'}</span>
          </button>
          
          {!isNoteCollapsed && (
            <textarea
              value={dayData.note || ''}
              onChange={(e) => updateDayNote(dateStr, e.target.value)}
              placeholder="CNS state context..."
              className="w-full p-5 rounded-3xl bg-gray-50 border-none focus:ring-2 focus:ring-purple-600 font-bold h-24 resize-none text-sm animate-in fade-in duration-300"
            />
          )}
        </section>

        {/* Instances */}
        <section className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">Instances</h2>
            <button 
              onClick={() => setModalMode({ open: true })}
              className="w-8 h-8 bg-gray-900 text-white rounded-xl flex items-center justify-center active:scale-90 transition-all"
            >
              <Plus size={18} strokeWidth={3} />
            </button>
          </div>
          <div className="grid gap-3">
            {dayData.events.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-3xl border border-dashed border-gray-200">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-300">No data logged</p>
              </div>
            ) : (
              dayData.events.map(event => {
                const Icon = getIcon(event.category);
                return (
                  <button 
                    key={event.id} 
                    onClick={() => setModalMode({ open: true, event })}
                    className="w-full group p-4 rounded-2xl bg-white border border-gray-100 shadow-sm active:scale-[0.98] transition-all text-left space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-10 h-10 rounded-xl flex items-center justify-center",
                          event.type === 'recovery' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                        )}>
                          <Icon size={20} strokeWidth={3} />
                        </div>
                        <div>
                          <div className="text-xs font-black text-gray-900">{event.category}</div>
                          <div className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                            {event.duration} • obj {event.objectiveIntensity} • sub {event.intensity}
                          </div>
                        </div>
                      </div>
                      <div className={cn(
                        "text-lg font-black",
                        event.type === 'recovery' ? "text-green-600" : "text-red-600"
                      )}>
                        {event.type === 'recovery' ? `+${event.intensity}` : `-${event.intensity}`}
                      </div>
                    </div>
                    {event.notes && (
                      <div className="pl-13">
                        <p className="text-[10px] text-gray-500 font-medium line-clamp-2 italic">"{event.notes}"</p>
                      </div>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </section>
      </main>

      <button
        onClick={() => setModalMode({ open: true })}
        className="fixed bottom-24 right-8 w-16 h-16 bg-gray-900 text-white rounded-3xl shadow-2xl flex items-center justify-center active:scale-90 transition-all z-20"
      >
        <Plus size={32} strokeWidth={3} />
      </button>

      {modalMode.open && (
        <AddEventModal 
          dateStr={dateStr} 
          existingEvent={modalMode.event}
          onClose={() => setModalMode({ open: false })} 
          onDelete={(id) => { deleteEvent(dateStr, id); setModalMode({ open: false }); }}
          onSubmit={(ev) => {
            if (modalMode.event) {
              updateEvent(dateStr, { ...ev, id: modalMode.event.id } as Event);
            } else {
              addEvent(dateStr, ev as Omit<Event, 'id'>);
            }
            setModalMode({ open: false });
          }}
        />
      )}

      {isMottoLibraryOpen && (
        <MottoLibraryModal 
          onClose={() => setIsMottoLibraryOpen(false)}
          onSelect={(m) => {
            updateDayMotto(dateStr, m);
            setIsMottoLibraryOpen(false);
          }}
        />
      )}
    </div>
  );
};

const MottoLibraryModal = ({ onClose, onSelect }: { onClose: () => void, onSelect: (m: string) => void }) => {
  const { state, deleteMotto, updateMotto } = useApp();
  const [editingMotto, setEditingMotto] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (m: string) => {
    setEditingMotto(m);
    setEditValue(m);
  };

  const saveEdit = () => {
    if (editingMotto && editValue) {
      updateMotto(editingMotto, editValue);
      setEditingMotto(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/60 flex items-end sm:items-center justify-center z-50 p-4 backdrop-blur-md text-gray-900">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] flex flex-col max-h-[80vh] overflow-hidden animate-in slide-in-from-bottom duration-500 relative text-left">
        <div className="flex justify-between items-center p-7 pb-4 bg-white z-10 border-b border-gray-50">
          <h2 className="text-xl font-black tracking-tight text-gray-900">Motto Library</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-400 active:scale-90 transition-transform">
            <X size={16} strokeWidth={3}/>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-7 pt-4 space-y-4">
          {state.mottos.length === 0 ? (
            <div className="text-center py-12 bg-gray-50 rounded-[2rem] border border-dashed border-gray-200">
              <p className="text-xs font-bold text-gray-400">Library is empty.</p>
              <p className="text-[10px] text-gray-300 mt-1">Mottos save automatically when typed in daily view.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {state.mottos.map(m => (
                <div key={m} className="group flex items-center justify-between p-4 rounded-2xl bg-gray-50 border border-transparent hover:border-purple-200 transition-all">
                  {editingMotto === m ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input 
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={saveEdit}
                        onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                        className="flex-1 bg-white px-3 py-1.5 rounded-lg border-2 border-purple-200 font-bold text-sm focus:outline-none"
                      />
                      <button onClick={saveEdit} className="text-green-600"><Check size={20}/></button>
                    </div>
                  ) : (
                    <>
                      <button 
                        onClick={() => onSelect(m)}
                        className="flex-1 text-sm font-black text-gray-900 text-left pr-4"
                      >
                        {m}
                      </button>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => startEdit(m)} className="p-2 text-gray-400 hover:text-purple-600"><Edit2 size={16}/></button>
                        <button onClick={() => deleteMotto(m)} className="p-2 text-gray-400 hover:text-red-500"><X size={16}/></button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AddEventModal = ({ dateStr, existingEvent, onClose, onSubmit, onDelete }: { 
  dateStr: string, 
  existingEvent?: Event, 
  onClose: () => void, 
  onSubmit: (ev: any) => void,
  onDelete: (id: string) => void
}) => {
  const { state } = useApp();
  const [type, setType] = useState<'training' | 'recovery'>(existingEvent?.type || 'training');
  const [category, setCategory] = useState(existingEvent?.category || (type === 'training' ? state.config.categories.training[0] : state.config.categories.recovery[0]));
  const [intensity, setIntensity] = useState(existingEvent?.intensity || 2); // Subjective (1-4)
  const [objIntensity, setObjIntensity] = useState(existingEvent?.objectiveIntensity || 2); // Objective (1-10)
  const [duration, setDuration] = useState<Duration>(existingEvent?.duration || '<1h');
  const [notes, setNotes] = useState(existingEvent?.notes || '');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const categories = type === 'training' ? state.config.categories.training : state.config.categories.recovery;
  const scales = type === 'training' ? state.config.scales.training : state.config.scales.recovery;

  const DURATION_OPTS: { val: Duration, label: string }[] = [
    { val: '<1h', label: '< 1h' },
    { val: 'couple hours', label: '1-3h' },
    { val: 'half day', label: '4-6h' },
    { val: 'whole day', label: 'Day' }
  ];

  const selectedObjective = scales.objective.find(o => o.value === objIntensity);
  const selectedSubjective = scales.subjective.find(o => o.value === intensity);

  return (
    <div className="fixed inset-0 bg-gray-900/60 flex items-end sm:items-center justify-center z-50 p-4 backdrop-blur-md text-gray-900">
      <div className="bg-white w-full max-w-md rounded-[2.5rem] flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-500 relative text-left">
        {/* Fixed Header */}
        <div className="flex justify-between items-center p-7 pb-4 bg-white z-10 border-b border-gray-50">
          <h2 className="text-xl font-black tracking-tight">{existingEvent ? 'Edit Event' : 'Log Event'}</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center bg-gray-100 rounded-full text-gray-400 active:scale-90 transition-transform">
            <X size={16} strokeWidth={3}/>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-7 pt-4 space-y-6">
          <div className="flex p-1 bg-gray-100 rounded-2xl">
            <button
              onClick={() => { setType('training'); setCategory(state.config.categories.training[0]); }}
              className={cn("flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", type === 'training' ? "bg-white text-red-600 shadow-sm" : "text-gray-400")}
            >
              Training
            </button>
            <button
              onClick={() => { setType('recovery'); setCategory(state.config.categories.recovery[0]); }}
              className={cn("flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all", type === 'recovery' ? "bg-white text-green-600 shadow-sm" : "text-gray-400")}
            >
              Recovery
            </button>
          </div>

          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {categories.map(c => {
                  const Icon = getIcon(c);
                  return (
                    <button
                      key={c}
                      onClick={() => setCategory(c)}
                      className={cn(
                        "flex items-center gap-2 px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all",
                        category === c ? "bg-gray-900 text-white border-gray-900 shadow-md" : "bg-white text-gray-400 border-gray-50 hover:border-gray-200"
                      )}
                    >
                      <Icon size={12} strokeWidth={3} />
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Duration</label>
              <div className="grid grid-cols-4 gap-1.5">
                {DURATION_OPTS.map(d => (
                  <button
                    key={d.val}
                    onClick={() => setDuration(d.val)}
                    className={cn(
                      "py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest border-2 transition-all",
                      duration === d.val ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-400 border-gray-50"
                    )}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4 bg-gray-50 p-4 rounded-3xl border border-gray-100">
              <div className="space-y-3">
                <div className="flex justify-between items-end">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 italic">Objective Complexity</label>
                    <div className="text-sm font-black text-gray-900 mt-1">{selectedObjective?.label}</div>
                  </div>
                  <span className="text-lg font-black text-gray-900">{objIntensity}</span>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {scales.objective.map(o => (
                    <button
                      key={o.value}
                      onClick={() => setObjIntensity(o.value)}
                      className={cn(
                        "py-2 rounded-lg font-black text-xs border-2 transition-all",
                        objIntensity === o.value ? "bg-gray-900 border-gray-900 text-white" : "bg-white border-transparent text-gray-300"
                      )}
                    >
                      {o.value}
                    </button>
                  ))}
                </div>
                <p className="text-[8px] font-bold text-gray-400 leading-tight italic min-h-[2em]">
                  {selectedObjective?.description}
                </p>
              </div>

              <div className="space-y-3 border-t border-gray-200 pt-4">
                <div className="flex justify-between items-end">
                  <div>
                    <label className="text-[9px] font-black uppercase tracking-[0.2em] text-purple-400 italic">
                      {type === 'training' ? 'Subjective RPE' : 'Subjective Yield'}
                    </label>
                    <div className={cn("text-sm font-black mt-1", type === 'training' ? "text-red-600" : "text-green-600")}>
                      {selectedSubjective?.label}
                    </div>
                  </div>
                  <span className={cn("text-lg font-black", type === 'training' ? "text-red-600" : "text-green-600")}>{intensity}</span>
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {scales.subjective.map(o => (
                    <button
                      key={o.value}
                      onClick={() => setIntensity(o.value)}
                      className={cn(
                        "py-3 rounded-xl font-black text-xs border-2 transition-all",
                        intensity === o.value 
                          ? (type === 'training' ? "bg-red-600 border-red-600 text-white" : "bg-green-600 border-green-600 text-white")
                          : "bg-white border-transparent text-gray-300"
                      )}
                    >
                      {o.value}
                    </button>
                  ))}
                </div>
                <p className="text-[8px] font-bold text-gray-400 leading-tight italic min-h-[2em]">
                  {selectedSubjective?.description}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400">Context Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full p-4 rounded-2xl bg-gray-50 border-none focus:ring-2 focus:ring-gray-900 font-bold h-20 resize-none text-xs"
                placeholder="..."
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            {existingEvent && (
              <div className="relative flex flex-1">
                {showDeleteConfirm ? (
                  <div className="flex w-full gap-2 animate-in fade-in zoom-in duration-200">
                    <button onClick={() => onDelete(existingEvent.id)} className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Confirm Delete</button>
                    <button onClick={() => setShowDeleteConfirm(false)} className="px-4 bg-gray-100 text-gray-400 rounded-2xl font-black text-xs uppercase">Cancel</button>
                  </div>
                ) : (
                  <button onClick={() => setShowDeleteConfirm(true)} className="w-16 h-full bg-red-50 text-red-600 rounded-2xl font-black flex items-center justify-center active:scale-95 transition-transform"><X/></button>
                )}
              </div>
            )}
            {!showDeleteConfirm && (
              <button
                onClick={() => onSubmit({ type, category, intensity, objectiveIntensity: objIntensity, duration, custom_data: {}, notes, date: dateStr })}
                className="flex-1 py-4 bg-gray-900 text-white rounded-2xl font-black text-base active:scale-95 transition-all shadow-lg shadow-gray-200"
              >
                {existingEvent ? 'Update Instance' : 'Save Instance'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

import { InsightsView } from './Insights';
import { BarChart3 } from 'lucide-react';

export default function App() {
  const [view, setView] = useState<'calendar' | 'ledger' | 'insights'>('calendar');
  const [selectedDate, setSelectedDate] = useState(new Date());

  const navigateToLedger = (date: Date) => {
    setSelectedDate(date);
    setView('ledger');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col max-w-md mx-auto relative shadow-2xl">
      <div className="flex-1 overflow-y-auto bg-white pb-20">
        {view === 'calendar' ? (
          <CalendarView onSelectDate={navigateToLedger} />
        ) : view === 'ledger' ? (
          <DailyLedger date={selectedDate} onBack={() => setView('calendar')} onSelectDate={navigateToLedger} />
        ) : (
          <InsightsView />
        )}
      </div>

      <nav className="h-20 bg-white/80 backdrop-blur-md border-t border-gray-100 fixed bottom-0 w-full max-w-md flex items-center justify-around z-10 px-6">
        <button
          onClick={() => setView('calendar')}
          className={cn("flex flex-col items-center gap-1 transition-all", view === 'calendar' ? "text-purple-600 scale-110" : "text-gray-300")}
        >
          <CalendarIcon size={22} strokeWidth={3} />
          <span className="text-[8px] font-black uppercase tracking-[0.2em]">Calendar</span>
        </button>
        <button
          onClick={() => navigateToLedger(new Date())}
          className={cn("flex flex-col items-center gap-1 transition-all", view === 'ledger' ? "text-purple-600 scale-110" : "text-gray-300")}
        >
          <ClipboardList size={22} strokeWidth={3} />
          <span className="text-[8px] font-black uppercase tracking-[0.2em]">Daily</span>
        </button>
        <button
          onClick={() => setView('insights')}
          className={cn("flex flex-col items-center gap-1 transition-all", view === 'insights' ? "text-purple-600 scale-110" : "text-gray-300")}
        >
          <BarChart3 size={22} strokeWidth={3} />
          <span className="text-[8px] font-black uppercase tracking-[0.2em]">Insights</span>
        </button>
      </nav>
    </div>
  );
}
