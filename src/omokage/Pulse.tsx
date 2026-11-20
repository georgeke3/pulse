import { useState } from 'react';
import { useApp } from '../store';
import { SKINS, todayStr } from './skins';

const S = SKINS.present;
export const PulseFlow = ({ onClose }: { onClose: () => void }) => {
  const { state, updateAnswers } = useApp();
  const today = todayStr();
  const qs = state.config.daily_questions;
  const [i, setI] = useState(0);
  const [ans, setAns] = useState<Record<string, number>>({ ...(state.days[today]?.answers ?? {}) });
  const q = qs[i];
  const pick = (v: number) => {
    const next = { ...ans, [q.id]: v };
    setAns(next);
    if (i + 1 < qs.length) setI(i + 1); else { updateAnswers(today, next); onClose(); }
  };
  return (
    <div style={{ position: 'absolute', inset: 0, background: S.paper, zIndex: 20, display: 'flex', flexDirection: 'column', padding: '18px 16px 16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: S.mute, fontSize: 13 }}>
        <button onClick={() => (i > 0 ? setI(i - 1) : onClose())} style={{ background: 'none', border: 0, color: S.mute, fontSize: 15 }}>{i > 0 ? '‹ back' : '× close'}</button>
        <span>{i + 1} / {qs.length}</span>
        <button onClick={() => { updateAnswers(today, ans); onClose(); }} style={{ background: 'none', border: 0, color: S.mute, fontSize: 15 }}>save</button>
      </div>
      <div style={{ height: 3, background: S.line + '55', borderRadius: 3, marginTop: 10 }}><div style={{ height: 3, width: `${((i + 1) / qs.length) * 100}%`, background: S.accent, borderRadius: 3 }} /></div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', fontSize: 24, color: S.ink, padding: '0 10px' }}>{q.prompt.replace(/^\d+\.\s*/, '')}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, paddingBottom: 6 }}>
        {q.options.map(o => (
          <button key={o.value} title={o.description} onClick={() => pick(o.value)}
            style={{ height: 78, borderRadius: 16, border: `2px solid ${ans[q.id] === o.value ? S.accent : S.line}`, background: ans[q.id] === o.value ? S.accent + '33' : S.card, color: S.ink, fontFamily: 'inherit', fontSize: 16 }}>
            <div style={{ color: S.accent, fontSize: 12 }}>{o.value}</div>{o.label}
          </button>
        ))}
      </div>
      <div style={{ minHeight: 34, textAlign: 'center', fontSize: 12, color: S.mute, padding: '8px 6px 0' }}>{ans[q.id] ? q.options.find(o => o.value === ans[q.id])?.description : ''}</div>
    </div>
  );
};
