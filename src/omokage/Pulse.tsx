import { useState } from 'react';
import { useApp } from '../store';
import { haptic } from './haptics';
import { dstr, todayStr } from './skins';

const ASK: Record<string, string> = {
  driver: 'What drove your effort today?',
  frame: 'How did you move through the day?',
  ego: 'How steady was your sense of self?',
  outlook: 'How much did the day hold for you?',
  relational: 'How did you show up for people?',
  ram: 'How clear was your head?',
  gratitude: 'How did you see what you have?',
  boundary: 'How did you hold yourself and others?',
  responsibility: 'How did the weight sit on you?',
  agency: 'How did you meet what you couldn’t control?',
};
const parse = (p: string) => {
  const m = p.replace(/^\d+\.\s*/, '').match(/^(.*?)\s*\((.*)\)\s*$/);
  return m ? { name: m[1], sub: m[2] } : { name: p.replace(/^\d+\.\s*/, ''), sub: '' };
};

export const PulseFlow = ({ onClose }: { onClose: () => void }) => {
  const { state, updateAnswers } = useApp();
  const today = todayStr();
  const qs = state.config.daily_questions;
  const [ans, setAns] = useState<Record<string, number>>({ ...(state.days[today]?.answers ?? {}) });
  const firstOpen = qs.findIndex(q => !ans[q.id]);
  const [i, setI] = useState(firstOpen === -1 ? qs.length : firstOpen);
  const [info, setInfo] = useState(false);

  const pick = (v: number) => {
    const q = qs[i];
    const next = { ...ans, [q.id]: v };
    setAns(next); setInfo(false); haptic(8);
    updateAnswers(today, next);
    setTimeout(() => setI(k => k + 1), 140);
  };

  if (i >= qs.length) return <Recap ans={ans} onEdit={k => setI(k)} onClose={onClose} />;
  const q = qs[i], { name, sub } = parse(q.prompt);
  return (
    <div className="sheet">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 30 }}>
        <button className="press" onClick={onClose} style={{ fontSize: 13, color: '#6E6250', padding: '6px 6px 6px 0' }}>‹ Close</button>
        <span className="serif" style={{ fontSize: 16 }}>Evening pulse</span>
        <span className="caps" style={{ width: 44, textAlign: 'right' }}>{i + 1}/{qs.length}</span>
      </div>
      <div className="pips">{qs.map((x, k) => <button key={x.id} aria-label={`Question ${k + 1}`} className={k === i ? 'cur' : ans[x.id] ? 'ans' : ''} onClick={() => setI(k)} />)}</div>

      <div className="q" key={q.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 10, padding: '0 8px' }}>
        <span className="caps">{name}{sub && <> · {sub}</>}</span>
        <div className="serif" style={{ fontSize: 27, lineHeight: 1.22, letterSpacing: '-.01em', maxWidth: 320 }}>{ASK[q.id] ?? name}</div>
        <svg width="90" height="10" viewBox="0 0 90 10" aria-hidden><path d="M2 5 H38 M52 5 H88" stroke="#B8924A" strokeWidth="1" /><path d="M45 1 L49 5 L45 9 L41 5Z" fill="none" stroke="#B8924A" /></svg>
        {info && (
          <div style={{ textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 7, marginTop: 4, animation: 'enter .3s both' }}>
            {q.options.map(o => <div key={o.value} style={{ fontSize: 12.5, lineHeight: 1.4 }}><b className="serif" style={{ color: '#8A6A2E' }}>{o.value} · {o.label}</b> <span style={{ color: '#6E6250' }}>{o.description}</span></div>)}
          </div>
        )}
        <button className="press" onClick={() => setInfo(v => !v)} style={{ fontSize: 12, color: '#8A6A2E', padding: '4px 10px', borderRadius: 99, boxShadow: 'inset 0 0 0 1px rgba(184,146,74,.6)' }}>{info ? 'hide meanings' : 'what do these mean?'}</button>
      </div>

      <div className="opts">
        {q.options.map(o => (
          <button key={o.value} className={`opt ${ans[q.id] === o.value ? 'on' : ''}`} onClick={() => pick(o.value)}>
            <span className="v">{['I', 'II', 'III', 'IV'][o.value - 1] ?? o.value}</span>
            <span className="l">{o.label}</span>
            <span className="d">{o.description}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

const Recap = ({ ans, onEdit, onClose }: { ans: Record<string, number>; onEdit: (k: number) => void; onClose: () => void }) => {
  const { state } = useApp();
  const qs = state.config.daily_questions;
  const vals = qs.map(q => ans[q.id]).filter(Boolean);
  const avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  const week: number[] = [];
  for (let d = 1; d <= 7; d++) {
    const k = new Date(); k.setDate(k.getDate() - d);
    const a = state.days[dstr(k)]?.answers; if (!a) continue;
    const v = Object.values(a); if (v.length) week.push(v.reduce((x, y) => x + y, 0) / v.length);
  }
  const wavg = week.length ? week.reduce((a, b) => a + b, 0) / week.length : null;
  const delta = wavg === null ? null : avg - wavg;
  const word = avg >= 3.5 ? 'Radiant' : avg >= 3 ? 'Steady' : avg >= 2.4 ? 'Holding' : avg >= 1.8 ? 'Strained' : 'Heavy';
  return (
    <div className="sheet">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 30 }}>
        <span style={{ width: 50 }} />
        <span className="serif" style={{ fontSize: 16 }}>Tonight</span>
        <span style={{ width: 50 }} />
      </div>
      <div className="q" style={{ textAlign: 'center', marginTop: 6 }}>
        <div className="caps">Your pulse</div>
        <div className="serif" style={{ fontSize: 56, lineHeight: 1.05, fontWeight: 600, color: '#3B4250' }}>{avg.toFixed(1)}</div>
        <div className="serif" style={{ fontSize: 19, fontStyle: 'italic', color: '#8A6A2E' }}>{word}</div>
        <div style={{ fontSize: 12.5, color: '#6E6250', marginTop: 4 }}>
          {delta === null ? 'First pulse this week' : Math.abs(delta) < .1 ? 'Right in line with your week' : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)} vs your last 7 days`}
        </div>
      </div>
      <div className="codex q" style={{ padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 1, animationDelay: '.08s' }}>
        {qs.map((q, k) => {
          const v = ans[q.id] ?? 0;
          return (
            <button key={q.id} onClick={() => onEdit(k)} style={{ display: 'flex', alignItems: 'center', gap: 10, height: 33, textAlign: 'left' }}>
              <span style={{ flex: 1, fontSize: 13 }}>{parse(q.prompt).name}</span>
              <span style={{ fontSize: 11.5, color: '#6E6250', width: 92, textAlign: 'right' }}>{q.options.find(o => o.value === v)?.label ?? '—'}</span>
              <span style={{ display: 'flex', gap: 3 }}>{[1, 2, 3, 4].map(n => <i key={n} style={{ width: 13, height: 6, borderRadius: 2, background: n <= v ? (v >= 3 ? '#8A9A6A' : v === 2 ? '#C9A86A' : '#C4643F') : 'rgba(138,106,46,.16)' }} />)}</span>
            </button>
          );
        })}
      </div>
      <div className="grow" />
      <button className="press" onClick={onClose} style={{ height: 50, borderRadius: 14, background: 'linear-gradient(180deg,#3E4A64,#2E384E)', color: '#F4EAD4', fontSize: 16, fontWeight: 600, boxShadow: 'inset 0 0 0 1px rgba(226,201,142,.4)' }}>Rest well</button>
    </div>
  );
};
