import { useState } from 'react';
import { useApp } from '../store';
import { Belt, Fly } from './Art';
import { haptic } from './haptics';
import { ActionBar } from './Actions';
import { useSwipe } from './swipe';
import { Sheet } from './Sheet';
import { DUSK, GOLD, INK, INK2, dayNow, dstr, fromDstr, todayStr } from './skins';

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
const ROMAN = ['I', 'II', 'III', 'IV'];
export const pulseWord = (avg: number) => (avg >= 3.5 ? 'Radiant' : avg >= 3 ? 'Steady' : avg >= 2.4 ? 'Holding' : avg >= 1.8 ? 'Strained' : 'Heavy');

export const PulseFlow = ({ day, onClose }: { day?: string; onClose: () => void }) => {
  const { state, updateAnswers } = useApp();
  const today = day ?? todayStr();
  const qs = state.config.daily_questions;
  const [ans, setAns] = useState<Record<string, number>>({ ...(state.days[today]?.answers ?? {}) });
  const firstOpen = qs.findIndex(q => !ans[q.id]);
  const [i, setI] = useState(firstOpen === -1 ? qs.length : firstOpen);

  const pick = (v: number) => {
    const q = qs[i], next = { ...ans, [q.id]: v };
    setAns(next); haptic(8);
    updateAnswers(today, next);
    setTimeout(() => setI(k => k + 1), 160);
  };

  const step = (n: number) => { haptic(6); setI(k => Math.max(0, Math.min(qs.length, k + n))); };
  const swipe = useSwipe(() => step(1), () => step(-1));
  if (i >= qs.length) return <Recap title={day && day !== todayStr() ? fromDstr(day).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'short' }) : 'Tonight'} ans={ans} onEdit={setI} onBack={() => step(-1)} onClose={onClose} />;
  const q = qs[i], { name, sub } = parse(q.prompt);
  return (
    <Sheet mode="present">
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }} viewBox="0 0 393 852" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <Belt d="M-30 470 C 80 420, 160 500, 260 430 S 380 380, 430 360" c={GOLD} w={8} o={.22} />
        <Fly x={320} y={352} s={.5} c={DUSK} o={.35} /><Fly x={352} y={320} s={.36} c={DUSK} o={.25} d={1.5} />
      </svg>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 22px 0', fontSize: 13, color: INK2 }}>
        <span style={{ width: 48 }} />
        <span className="it" style={{ fontSize: 16, color: INK }}>Evening pulse</span>
        <span style={{ width: 48, textAlign: 'right', whiteSpace: 'nowrap' }}>{i + 1} / {qs.length}</span>
      </div>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: 0, padding: '12px 40px 0' }}>
        {qs.map((x, k) => {
          const y = -Math.sin(k / (qs.length - 1) * Math.PI) * 8, cur = k === i, done = !!ans[x.id];
          return (
            <button key={x.id} aria-label={`Question ${k + 1}`} onClick={() => setI(k)} style={{ width: 27, height: 26, display: 'grid', placeItems: 'center', transform: `translateY(${y}px)` }}>
              <i style={{ width: cur ? 9 : 7, height: cur ? 9 : 7, borderRadius: 5, background: cur ? INK : done ? GOLD : 'transparent', boxShadow: done || cur ? 'none' : `inset 0 0 0 1px rgba(43,50,71,.35)` }} />
            </button>
          );
        })}
      </div>
      <div className="q" key={q.id} {...swipe} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '0 30px', gap: 12, ...swipe.style }}>
        <span className="caps">{name}{sub && <> · {sub}</>}</span>
        <div className="serif" style={{ fontSize: 31, lineHeight: 1.2, letterSpacing: '-.01em', maxWidth: 330 }}>{ASK[q.id] ?? name}</div>
      </div>
      <div {...swipe} style={{ position: 'relative', display: 'grid', gridTemplateColumns: '1fr 1fr', gridAutoRows: '1fr', gap: 10, padding: '0 16px 12px', ...swipe.style }}>
        {q.options.map(o => (
          <button key={o.value} className={`opt ${ans[q.id] === o.value ? 'on' : ''}`} onClick={() => pick(o.value)}>
            <span className="serif" style={{ fontSize: 12, color: GOLD, fontWeight: 600, letterSpacing: '.08em' }}>{ROMAN[o.value - 1] ?? o.value}</span>
            <span className="serif" style={{ fontSize: 19 }}>{o.label}</span>
            <span style={{ fontSize: 11.5, color: INK2, lineHeight: 1.38 }}>{o.description}</span>
          </button>
        ))}
      </div>
      <ActionBar h={46} cancel="Close" onCancel={onClose}>
        <button className="chip press" onClick={() => step(-1)} disabled={i === 0} style={{ height: 46, flex: 1, fontSize: 15, opacity: i === 0 ? .35 : 1 }}>‹ Prev</button>
        <button className="chip on press" onClick={() => step(1)} style={{ height: 46, flex: 1, fontSize: 15 }}>{i === qs.length - 1 ? 'Summary ›' : 'Next ›'}</button>
      </ActionBar>
    </Sheet>
  );
};

/* Tonight, as a constellation: ten answers on a ring, with the week's average dashed behind. */
const Recap = ({ title, ans, onEdit, onBack, onClose }: { title: string; ans: Record<string, number>; onEdit: (k: number) => void; onBack: () => void; onClose: () => void }) => {
  const swipe = useSwipe(() => {}, onBack);
  const { state } = useApp();
  const qs = state.config.daily_questions;
  const vals = qs.map(q => ans[q.id] ?? 0);
  const answered = vals.filter(Boolean);
  const avg = answered.length ? answered.reduce((a, b) => a + b, 0) / answered.length : 0;
  const weekPer = qs.map(() => [] as number[]); const weekAvg: number[] = [];
  for (let d = 1; d <= 7; d++) {
    const k = dayNow(); k.setDate(k.getDate() - d);
    const a = state.days[dstr(k)]?.answers; if (!a) continue;
    qs.forEach((q, j) => { if (a[q.id]) weekPer[j].push(a[q.id]); });
    const v = Object.values(a); if (v.length) weekAvg.push(v.reduce((x, y) => x + y, 0) / v.length);
  }
  const week = weekPer.map(a => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0));
  const wavg = weekAvg.length ? weekAvg.reduce((a, b) => a + b, 0) / weekAvg.length : null;
  const delta = wavg === null ? null : avg - wavg;
  const word = pulseWord(avg);
  const names = qs.map(q => parse(q.prompt).name);
  const max = Math.max(...vals), min = Math.min(...vals.filter(Boolean));
  const strongest = names.filter((_, k) => vals[k] === max && max > 0), gentlest = names.filter((_, k) => vals[k] === min && min < max);
  const cx = 196, cy = 190, R = 108, n = qs.length;
  const pt = (k: number, v: number) => { const a = -Math.PI / 2 + 2 * Math.PI * k / n; return [cx + R * v / 4 * Math.cos(a), cy + R * v / 4 * Math.sin(a)]; };
  const poly = (f: (k: number) => number) => Array.from({ length: n }, (_, k) => pt(k, f(k)).map(z => z.toFixed(1)).join(',')).join(' ');
  return (
    <Sheet mode="present">
      <div className="wash" style={{ left: 20, top: 230, width: 360, height: 360, background: 'rgba(200,161,90,.2)' }} />
      <div {...swipe} style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', ...swipe.style }}>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 22px 0' }}>
        <button className="press" onClick={onBack} aria-label="Back to the questions" style={{ fontSize: 13, color: INK2, flex: 1, textAlign: 'left', whiteSpace: 'nowrap' }}>‹ Questions</button>
        <span className="it" style={{ fontSize: 16 }}>{title}</span><span style={{ flex: 1 }} />
      </div>
      <div className="q" style={{ position: 'relative', textAlign: 'center', marginTop: 10 }}>
        <div className="caps">your pulse</div>
        <div className="serif" style={{ fontSize: 60, lineHeight: 1.05, fontWeight: 500 }}>{avg.toFixed(1)}</div>
        <div className="it" style={{ fontSize: 19, color: GOLD }}>{word}</div>
        <div style={{ fontSize: 12, color: INK2, marginTop: 4 }}>
          {delta === null ? 'First pulse this week' : Math.abs(delta) < .1 ? 'Right in line with your week' : `${delta > 0 ? '▲' : '▼'} ${Math.abs(delta).toFixed(1)} ${delta > 0 ? 'above' : 'below'} your week`} {wavg !== null && <span style={{ color: DUSK }}>- - -</span>}
        </div>
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0 }}>
        <svg viewBox="0 0 393 380" preserveAspectRatio="xMidYMid meet" style={{ width: '100%', height: '100%' }} aria-label="Tonight's answers">
          {[1, 2, 3, 4].map(v => <polygon key={v} points={poly(() => v)} fill="none" stroke={INK} strokeWidth=".6" opacity={v < 4 ? .08 : .2} />)}
          {wavg !== null && <polygon points={poly(k => week[k])} fill="none" stroke={DUSK} strokeWidth="1" strokeDasharray="3 3" />}
          <polygon points={poly(k => vals[k])} fill="rgba(200,161,90,.22)" stroke={GOLD} strokeWidth="1.4" style={{ animation: 'enter .6s both' }} />
          {vals.map((v, k) => { const [x, y] = pt(k, v); return <circle key={k} cx={x} cy={y} r="4" fill="#fff" stroke={GOLD} strokeWidth="1.4" />; })}
          {names.map((nm, k) => { const [x, y] = pt(k, 5.1); return <text key={k} x={x} y={y + 3} fontSize="9.5" textAnchor="middle" fill={INK2} fontFamily="Inter, sans-serif" onClick={() => onEdit(k)} style={{ cursor: 'pointer' }}>{nm}</text>; })}
        </svg>
      </div>
      <div className="it" style={{ position: 'relative', textAlign: 'center', fontSize: 14, color: INK2, lineHeight: 1.5, padding: '0 24px 14px' }}>
        {strongest.length > 0 && <>Strongest: {strongest.join(', ')}.<br /></>}{gentlest.length > 0 && <>Gentlest: {gentlest.join(', ')}.</>}
      </div>
      </div>
      <div style={{ position: 'relative', padding: '0 18px calc(var(--bot) + 8px)' }}>
        <button className="ink-btn it press" onClick={onClose} style={{ width: '100%', height: 54, fontSize: 16 }}>Rest well</button>
      </div>
    </Sheet>
  );
};
