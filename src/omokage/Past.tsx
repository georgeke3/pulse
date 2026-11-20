import { Sym } from './Sym';
import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { Fly, Pencil } from './Art';
import { useItems } from './items';
import { INK, INK2, SEPIA, agoWords, dstr, fromDstr, todayStr } from './skins';
import { Typing } from './Typing';

const QUESTIONS = [
  'What made you laugh, even briefly?',
  'What felt heavy this week, and what felt light?',
  'What is one small thing worth remembering about today?',
  'Who showed up for you lately, and how?',
  'What did you hold too tightly today?',
  'What are you quietly proud of?',
  'What would you tell yourself a year ago?',
];
const CHIPS = ['Mila', 'Kat', 'work', 'sleep', 'gym', 'friends', 'money'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
interface Entry { id: string; day: string; body: string; tags?: string[] }

export const usePastEntries = () => {
  const { state } = useApp();
  const { items } = useItems();
  return useMemo<Entry[]>(() => {
    const mine = items.filter(i => i.kind === 'past').map(i => ({ id: i.id, day: i.day, body: i.body, tags: (i.meta?.tags as string[]) ?? [] }));
    const legacy = Object.entries(state.days).filter(([, d]) => d.note?.trim()).map(([day, d]) => ({ id: 'n' + day, day, body: d.note!.trim() }));
    return [...mine, ...legacy].sort((a, b) => b.day.localeCompare(a.day));
  }, [items, state.days]);
};
const oneLine = (s: string) => s.split('\n').map(x => x.trim()).filter(Boolean).join('. ').replace(/\.\./g, '.');

const Decor = ({ flies = true }: { flies?: boolean }) => (
  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 393 740" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <Pencil d="M-30 590 C 90 540, 170 600, 270 530 S 400 420, 440 400" />
    {flies && <>
    <Fly x={318} y={92} s={.8} c={SEPIA} o={.8} st="outline" /><Fly x={350} y={64} s={.6} c={SEPIA} o={.6} st="outline" d={1} />
    <Fly x={370} y={28} s={.45} c={SEPIA} o={.45} st="outline" d={2} /><Fly x={360} y={118} s={.34} c={SEPIA} o={.3} st="outline" d={.5} />
    </>}
  </svg>
);

export const Past = ({ typing, setTyping }: { typing: boolean; setTyping: (b: boolean) => void }) => {
  const { add } = useItems();
  const all = usePastEntries();
  const now = new Date(), today = todayStr();
  const q = QUESTIONS[now.getDay()];
  const [tags, setTags] = useState<string[]>([]);
  const years = Array.from(new Set([String(now.getFullYear()), ...all.map(a => a.day.slice(0, 4))])).sort().reverse();
  const [year, setYear] = useState(years[0]);
  const [month, setMonth] = useState<string | null>(null);
  const todays = all.filter(a => a.day === today);
  const memory = useMemo(() => {
    const dd = today.slice(8), older = all.filter(a => a.day < today);
    return older.find(a => a.day.slice(8) === dd) ?? older.find(a => Math.abs(+a.day.slice(8) - +dd) <= 2) ?? older[Math.floor(older.length / 3)];
  }, [all, today]);
  const perMonth = (m: number) => all.filter(a => a.day.startsWith(`${year}-${String(m + 1).padStart(2, '0')}`)).length;
  const week = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d; });

  if (month) {
    const list = all.filter(a => a.day.startsWith(month));
    return (
      <div className="screen" style={{ paddingBottom: 0 }}>
        <Decor flies={false} />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 10 }}>
          <button className="press" onClick={() => setMonth(null)} style={{ fontSize: 13, color: INK2, padding: '4px 0' }}>‹ Browse</button>
          <span className="it" style={{ fontSize: 19 }}>{fromDstr(month + '-01').toLocaleDateString('en', { month: 'long', year: 'numeric' })}</span>
          <span className="caps">{list.length} {list.length === 1 ? 'page' : 'pages'}</span>
        </div>
        <div className="scroll grow" style={{ position: 'relative', margin: '0 -24px', padding: '10px 24px 20px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {list.length === 0 && <div className="it mute" style={{ textAlign: 'center', marginTop: 60, fontSize: 15 }}>An empty page, for now.</div>}
          {list.map((a, i) => (
            <div key={a.id} className="torn" style={{ transform: `rotate(${(i % 3 - 1) * .7}deg)`, animation: `enter .4s ${Math.min(i, 6) * 40}ms both`, flex: 'none' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                <span className="it" style={{ fontSize: 13, color: INK2 }}>{fromDstr(a.day).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                <span style={{ display: 'flex', gap: 4 }}>{(a.tags ?? []).map(t => <span key={t} className="caps" style={{ fontSize: 8.5 }}>{t}</span>)}</span>
              </div>
              <p className="serif" style={{ fontSize: 15, lineHeight: 1.55, whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text', WebkitUserSelect: 'text', color: '#3A4156' }}>{a.body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <Decor />
      <div style={{ position: 'relative', paddingTop: 14 }}>
        <div className="caps">tonight’s question</div>
        <div className="it" style={{ fontSize: 27, lineHeight: 1.28, marginTop: 10, maxWidth: 300 }}>{q}</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 16 }}>
          {CHIPS.slice(0, 5).map(c => { const on = tags.includes(c); return <button key={c} className={`chip ${on ? 'on' : ''}`} onClick={() => setTags(v => (on ? v.filter(x => x !== c) : [...v, c]))}>{c}</button>; })}
        </div>
        <button className="press" onClick={() => setTyping(true)} style={{ width: '100%', marginTop: 14, height: 48, display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1.2px dashed rgba(43,50,71,.3)', textAlign: 'left' }}>
          <Sym n="wisp" on={todays.length > 0} s={22} />
          <span className="it" style={{ fontSize: 16, color: INK2, flex: 1 }}>{todays.length ? 'Written tonight · add a few more lines' : 'Write a few lines…'}</span>
          
        </button>
      </div>

      {memory && (
        <button className="press" onClick={() => { setYear(memory.day.slice(0, 4)); setMonth(memory.day.slice(0, 7)); }} style={{ position: 'relative', marginTop: 34, textAlign: 'left', display: 'block', width: '100%' }}>
          <span className="tape-strip" style={{ left: 'calc(50% - 50px)', top: -9, transform: 'rotate(-4deg)' }} />
          <div className="torn" style={{ transform: 'rotate(-1.2deg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="caps">a page from {agoWords(memory.day)}</span>
              <span className="it" style={{ fontSize: 12, color: INK2 }}>{fromDstr(memory.day).toLocaleDateString('en', { month: 'short', day: 'numeric' })}</span>
            </div>
            <div className="it" style={{ fontSize: 15, lineHeight: 1.55, marginTop: 8, color: '#3A4156', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>“{oneLine(memory.body)}”</div>
          </div>
        </button>
      )}

      <div className="grow" />

      <div style={{ position: 'relative' }}>
        <div className="caps">this week, in pages</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
          {week.map(d => {
            const k = dstr(d), n = all.some(a => a.day === k), isT = k === today;
            return (
              <div key={k} style={{ width: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                <Sym n="ginkgo" on={n} s={26} o={isT ? 1 : n ? .85 : .6} />
                <span style={{ fontSize: 10, color: isT ? INK : INK2, fontWeight: isT ? 600 : 400 }}>{d.toLocaleDateString('en', { weekday: 'narrow' })}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ position: 'relative', marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span className="caps">browse the past</span>
          <span style={{ display: 'flex', gap: 12 }}>{years.slice(0, 3).map(y => <button key={y} className="it" onClick={() => setYear(y)} style={{ fontSize: 13, fontWeight: y === year ? 600 : 400, color: y === year ? INK : INK2, padding: '4px 0' }}>{y}</button>)}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', rowGap: 4, marginTop: 8 }}>
          {MONTHS.map((m, i) => {
            const n = perMonth(i), cur = year === String(now.getFullYear()) && i === now.getMonth(), fut = year === String(now.getFullYear()) && i > now.getMonth();
            return (
              <button key={m} disabled={fut} onClick={() => setMonth(`${year}-${String(i + 1).padStart(2, '0')}`)} style={{ height: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, opacity: fut ? .3 : 1 }}>
                <span className={cur ? 'it' : ''} style={{ fontSize: 14, fontWeight: cur ? 600 : 400, color: cur ? SEPIA : INK }}>{m}</span>
                <span style={{ display: 'flex', gap: 2, height: 4 }}>{Array.from({ length: Math.min(5, Math.ceil(n / 5)) }, (_, k) => <i key={k} style={{ width: 4, height: 4, borderRadius: 2, background: SEPIA }} />)}</span>
              </button>
            );
          })}
        </div>
      </div>

      {typing && <Typing mode="past" label="past · writing" prompt={q} chips={CHIPS} initialTags={tags} placeholder="Whatever comes…"
        onCancel={() => setTyping(false)} onSave={(t, tg) => { add({ kind: 'past', body: t, board: null, meta: { tags: tg, question: q } }); setTags([]); setTyping(false); }} />}
    </div>
  );
};
