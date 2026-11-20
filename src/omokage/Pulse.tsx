import { useState } from 'react';
import { useApp } from '../store';
import { SERIF, todayStr } from './skins';

export const PulseFlow = ({ onClose }: { onClose: () => void }) => {
  const { state, updateAnswers } = useApp();
  const today = todayStr();
  const qs = state.config.daily_questions;
  const [i, setI] = useState(0);
  const [info, setInfo] = useState(false);
  const [ans, setAns] = useState<Record<string, number>>({ ...(state.days[today]?.answers ?? {}) });
  const q = qs[i];
  const done = () => { updateAnswers(today, ans); onClose(); };
  const pick = (v: number) => {
    const next = { ...ans, [q.id]: v };
    setAns(next); setInfo(false);
    if (i + 1 < qs.length) setI(i + 1); else { updateAnswers(today, next); onClose(); }
  };
  const title = q.prompt.replace(/^\d+\.\s*/, '');
  return (
    <div style={{ position: 'absolute', inset: 0, background: '#E8DCC4', zIndex: 20, display: 'flex', flexDirection: 'column', padding: '6px 16px 14px', gap: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#5F5A4E' }}>
        <button onClick={done} style={{ background: 'none', border: 0, padding: '6px 0', color: '#5F5A4E', fontFamily: 'inherit', fontSize: 13 }}>‹ close</button>
        <span style={{ alignSelf: 'center' }}>before sleep</span>
      </div>
      <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
        {qs.map((x, k) => <button key={x.id} onClick={() => setI(k)} aria-label={`question ${k + 1}`} style={{ width: 26, height: 8, borderRadius: 4, border: 0, padding: 0, background: k === i ? '#3B4250' : ans[x.id] ? '#9C7B3C' : '#D8CBB0' }} />)}
      </div>
      <div style={{ textAlign: 'center', fontSize: 12, color: '#5F5A4E' }}>{i + 1} of {qs.length} · tap a dot to revisit</div>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', gap: 8 }}>
        <div style={{ fontFamily: SERIF, fontSize: 24, lineHeight: 1.25 }}>{title}</div>
        {info && (
          <div style={{ width: '100%', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 6, marginTop: 6 }}>
            {q.options.map(o => <div key={o.value} style={{ fontSize: 12.5, lineHeight: 1.35, color: '#3B4250' }}><b style={{ color: '#9C7B3C' }}>{o.value} {o.label}</b> · <span style={{ color: '#5F5A4E' }}>{o.description}</span></div>)}
          </div>
        )}
        <button onClick={() => setInfo(v => !v)} style={{ background: 'none', border: '1px solid #9C7B3C', borderRadius: 99, width: 24, height: 24, fontSize: 13, color: '#9C7B3C', fontFamily: SERIF, fontStyle: 'italic' }} aria-label="what do these mean">i</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {q.options.map(o => {
          const on = ans[q.id] === o.value;
          return (
            <button key={o.value} onClick={() => pick(o.value)} style={{ height: 84, border: '2px solid #9C7B3C', borderRadius: 14, background: on ? '#E3CF9E' : '#F0E6D0', padding: '10px 12px', boxSizing: 'border-box', textAlign: 'left', fontFamily: 'inherit', color: '#3B4250', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 2 }}>
              <span style={{ fontSize: 11, color: '#9C7B3C', fontWeight: 600 }}>{o.value}</span>
              <span style={{ fontSize: 16, fontWeight: 500 }}>{o.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
