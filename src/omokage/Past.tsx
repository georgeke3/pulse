import { useMemo, useState } from 'react';
import { useApp } from '../store';
import { useItems } from './items';
import { SERIF, SKINS } from './skins';
import { Typing } from './Typing';

const S = SKINS.past;
const QUESTIONS = ['What felt heavy this week, and what felt light?', 'What is one small thing you want to remember about today?', 'Who showed up for you lately, and how?', 'What did you let go of, or hold too tightly?', 'What made you laugh, even briefly?', 'What are you quietly proud of?', 'What would you tell yourself a year ago?'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const chipS = (on: boolean): React.CSSProperties => ({ display: 'inline-block', padding: '6px 11px', borderRadius: 99, fontSize: 13, margin: '0 5px 5px 0', border: 0, background: on ? S.ink : S.chip, color: on ? '#F2EEE6' : S.chipInk, fontFamily: 'inherit' });

export const Past = ({ typing, setTyping }: { typing: boolean; setTyping: (b: boolean) => void }) => {
  const { state } = useApp();
  const { items, add } = useItems();
  const now = new Date();
  const q = QUESTIONS[now.getDay()];
  const all = useMemo(() => {
    const mine = items.filter(i => i.kind === 'past').map(i => ({ id: i.id, day: i.day, body: i.body }));
    const legacy = Object.entries(state.days).filter(([, d]) => d.note?.trim()).map(([day, d]) => ({ id: 'n' + day, day, body: d.note!.trim() }));
    return [...mine, ...legacy].sort((a, b) => b.day.localeCompare(a.day));
  }, [items, state.days]);
  const years = Array.from(new Set([String(now.getFullYear()), ...all.map(a => a.day.slice(0, 4))])).sort().reverse();
  const [year, setYear] = useState(years[0]);
  const [month, setMonth] = useState<string | null>(null);
  const has = (m: number) => all.some(a => a.day.startsWith(`${year}-${String(m + 1).padStart(2, '0')}`));
  const listed = month ? all.filter(a => a.day.startsWith(month)) : [];

  if (month) return (
    <div style={{ flex: 1, padding: '6px 16px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
      <button onClick={() => setMonth(null)} style={{ alignSelf: 'flex-start', background: 'none', border: 0, padding: '4px 0', fontSize: 13, color: S.mute, fontFamily: 'inherit' }}>‹ {MONTHS[+month.slice(5) - 1]} {month.slice(0, 4)}</button>
      <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {listed.length === 0 && <div style={{ color: S.mute, fontSize: 13, textAlign: 'center', marginTop: 30 }}>Nothing written this month yet.</div>}
        {listed.map(a => (
          <div key={a.id} style={{ border: `1.5px dashed ${S.dash}`, borderRadius: 10, padding: '8px 10px', background: S.card }}>
            <div style={{ fontSize: 11, color: S.mute, marginBottom: 2 }}>{a.day}</div>
            <div style={{ fontSize: 14, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{a.body}</div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <>
      <div style={{ flex: 1, padding: '6px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        <div style={{ border: `1.5px dashed ${S.dash}`, borderRadius: 10, padding: '8px 10px', background: S.card }}>
          <div style={{ fontSize: 12, color: S.mute }}>One question today</div>
          <div style={{ fontFamily: SERIF, fontSize: 19, lineHeight: 1.35, margin: '2px 0 8px' }}>{q}</div>
          <div>{['sleep', 'work', 'Mila', 'money'].map(c => <button key={c} onClick={() => setTyping(true)} style={{ ...chipS(false), background: '#E3D6BE' }}>{c}</button>)}</div>
          <button onClick={() => setTyping(true)} style={{ width: '100%', height: 66, border: `1.5px dashed ${S.dash}`, borderRadius: '6px 14px 8px 12px', background: 'transparent', padding: 8, fontSize: 13, color: S.mute, textAlign: 'left', fontFamily: 'inherit' }}>Tap to type…</button>
        </div>
        <div style={{ fontSize: 12, color: S.mute }}>Browse the past</div>
        <div>{years.map(y => <button key={y} onClick={() => setYear(y)} style={chipS(y === year)}>{y}</button>)}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
          {MONTHS.map((m, i) => (
            <button key={m} onClick={() => setMonth(`${year}-${String(i + 1).padStart(2, '0')}`)} style={{ height: 44, boxSizing: 'border-box', border: `1.5px dashed ${S.dash}`, borderRadius: 10, fontSize: 13, background: has(i) ? '#E3D6BE' : 'transparent', color: S.ink, fontFamily: 'inherit', opacity: has(i) || (year === String(now.getFullYear()) && i === now.getMonth()) ? 1 : .55 }}>{m}</button>
          ))}
        </div>
        <div style={{ flex: 1 }} />
      </div>
      {typing && <Typing mode="past" heading="Past" prompt={q} chips={['sleep', 'Mila', 'work']} onCancel={() => setTyping(false)} onSave={t => { add({ kind: 'past', body: t, board: null }); setTyping(false); }} />}
    </>
  );
};
