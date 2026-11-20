import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { Butterfly } from './Art';
import { useItems } from './items';
import { ago, fromDstr, todayStr } from './skins';
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
const CHIPS = ['Mila', 'Kat', 'work', 'sleep', 'gym', 'money', 'friends'];
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

  // "On this day": same day-of-month in an earlier month, else the nearest older entry
  const memory = useMemo(() => {
    const dd = today.slice(8);
    const older = all.filter(a => a.day < today);
    return older.find(a => a.day.slice(8) === dd) ?? older.find(a => Math.abs(+a.day.slice(8) - +dd) <= 2) ?? older[Math.floor(older.length / 3)];
  }, [all, today]);

  const perMonth = (m: number) => all.filter(a => a.day.startsWith(`${year}-${String(m + 1).padStart(2, '0')}`)).length;

  if (month) {
    const list = all.filter(a => a.day.startsWith(month));
    const label = fromDstr(month + '-01').toLocaleDateString('en', { month: 'long', year: 'numeric' });
    return (
      <div className="screen" style={{ paddingBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
          <button className="press" onClick={() => setMonth(null)} style={{ fontSize: 13, color: 'var(--fg2)', padding: '4px 0' }}>‹ Browse</button>
          <span className="serif" style={{ fontSize: 19 }}>{label}</span>
          <span className="caps">{list.length} {list.length === 1 ? 'page' : 'pages'}</span>
        </div>
        <div className="scroll grow" style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingBottom: 14 }}>
          {list.length === 0 && <div className="quote mute" style={{ textAlign: 'center', marginTop: 60, fontSize: 15 }}>An empty page, for now.</div>}
          {list.map((a, i) => (
            <div key={a.id} className="sketch entry" style={{ transform: `rotate(${(i % 3 - 1) * .35}deg)`, animation: `enter .4s ${Math.min(i, 6) * 40}ms both` }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span className="serif" style={{ fontSize: 13, fontStyle: 'italic', color: 'var(--fg2)' }}>{fromDstr(a.day).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'short' })}</span>
                <span style={{ display: 'flex', gap: 4 }}>{(a.tags ?? []).map(t => <span key={t} className="tag">{t}</span>)}</span>
              </div>
              <p>{a.body}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="screen">
      <div className="sketch" style={{ padding: '11px 13px 12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="caps">Tonight’s question</span>
          <Butterfly c="#C4643F" s={18} />
        </div>
        <div className="quote" style={{ fontSize: 22, lineHeight: 1.3, margin: '4px 0 10px' }}>“{q}”</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 10 }}>
          {CHIPS.slice(0, 5).map(c => { const on = tags.includes(c);
            return <button key={c} className={`chip press ${on ? 'on' : ''}`} onClick={() => setTags(v => on ? v.filter(x => x !== c) : [...v, c])}>{c}</button>; })}
        </div>
        <button className="press" onClick={() => setTyping(true)} style={{ width: '100%', height: 58, borderRadius: '6px 14px 8px 12px', border: '1.3px dashed var(--line)', background: 'rgba(255,255,255,.55)', display: 'flex', alignItems: 'center', gap: 10, padding: '0 12px', textAlign: 'left' }}>
          <svg width="18" height="18" viewBox="0 0 32 32" fill="none" aria-hidden><path d="M22 5 L27 10 L12 25 L5 27 L7 20Z" stroke="#34405A" strokeWidth="1.6" strokeLinejoin="round" /><path d="M19 8 L24 13" stroke="#34405A" strokeWidth="1.6" /></svg>
          <span className="mute" style={{ fontSize: 14 }}>{todays.length ? `Written tonight · add more` : 'Tap to write'}</span>
          {todays.length > 0 && <span style={{ marginLeft: 'auto', color: '#C4643F', fontSize: 15 }}>✓</span>}
        </button>
      </div>

      {memory && (
        <button className="sketch press" onClick={() => { setYear(memory.day.slice(0, 4)); setMonth(memory.day.slice(0, 7)); }}
          style={{ padding: '10px 13px', textAlign: 'left', background: 'linear-gradient(170deg, #FBF7EE, #F1EADC)', transform: 'rotate(-.4deg)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="caps">A page from {ago(memory.day)}</span>
            <span className="serif" style={{ fontSize: 12, fontStyle: 'italic', color: 'var(--fg2)' }}>{fromDstr(memory.day).toLocaleDateString('en', { day: 'numeric', month: 'short' })}</span>
          </div>
          <div className="quote" style={{ fontSize: 14.5, lineHeight: 1.45, marginTop: 4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{memory.body.split('\n').join(' · ')}</div>
        </button>
      )}

      <div className="grow" />

      <div>
        <div className="caps" style={{ marginBottom: 6 }}>This week, in pages</div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          {Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            const n = all.filter(a => a.day === k).length, isT = k === today;
            return (
              <div key={k} style={{ width: 44, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <span style={{ width: 38, height: 38, borderRadius: '50%', display: 'grid', placeItems: 'center', border: `1.3px ${n ? 'solid' : 'dashed'} ${n ? '#6F86A3' : 'rgba(143,163,184,.7)'}`, background: n ? 'rgba(143,163,184,.18)' : 'transparent', boxShadow: isT ? '0 0 0 2px #F2EEE6, 0 0 0 3.3px #C4643F' : undefined }}>
                  {n ? <Butterfly c={isT ? '#C4643F' : '#6F86A3'} s={20} /> : <span style={{ fontSize: 11, color: 'var(--fg2)' }}>·</span>}
                </span>
                <span style={{ fontSize: 10, color: 'var(--fg2)', fontWeight: isT ? 600 : 400 }}>{d.toLocaleDateString('en', { weekday: 'short' })}</span>
              </div>
            ); })}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span className="caps">Browse the past</span>
        <span style={{ display: 'flex', gap: 6 }}>{years.map(y => <button key={y} className={`chip press ${y === year ? 'on' : ''}`} style={{ height: 28, fontSize: 12.5 }} onClick={() => setYear(y)}>{y}</button>)}</span>
      </div>
      <div className="months">
        {MONTHS.map((m, i) => {
          const n = perMonth(i), cur = year === String(now.getFullYear()) && i === now.getMonth();
          const future = year === String(now.getFullYear()) && i > now.getMonth();
          return (
            <button key={m} className="mon" disabled={future} onClick={() => setMonth(`${year}-${String(i + 1).padStart(2, '0')}`)}
              style={{ background: n ? `rgba(227,214,190,${Math.min(.9, .25 + n / 40)})` : 'transparent', opacity: future ? .35 : 1, boxShadow: cur ? 'inset 0 0 0 1.5px #C4643F' : undefined, borderStyle: cur ? 'solid' : 'dashed' }}>
              <span style={{ fontWeight: cur ? 600 : 400 }}>{m}</span>
              <span className="ink">{Array.from({ length: Math.min(5, Math.ceil(n / 5)) }, (_, k) => <i key={k} />)}</span>
            </button>
          );
        })}
      </div>

      {typing && <Typing mode="past" heading="Past" prompt={q} chips={CHIPS} initialTags={tags} placeholder="Whatever comes…"
        onCancel={() => setTyping(false)} onSave={(t, tg) => { add({ kind: 'past', body: t, board: null, meta: { tags: tg, question: q } }); setTags([]); setTyping(false); }} />}
    </div>
  );
};
