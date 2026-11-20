import { useState } from 'react';
import { useApp } from '../store';
import { Ground } from './Art';
import { Future } from './Future';
import { Glyph } from './Glyphs';
import { Home } from './Home';
import { ItemsProvider, useItems } from './items';
import { Past } from './Past';
import { Present } from './Present';
import { PulseFlow } from './Pulse';
import { Typing } from './Typing';
import { haptic } from './haptics';
import { shortDate, todayStr, type Mode } from './skins';
import './omokage.css';

const TABS: { m: Mode; label: string }[] = [{ m: 'home', label: 'Home' }, { m: 'past', label: 'Past' }, { m: 'present', label: 'Present' }, { m: 'future', label: 'Future' }];
const SUB: Record<Mode, string> = { home: '', past: 'what was', present: 'what is', future: 'what may be' };
const startMode = (): Mode => { const h = new Date().getHours(); return h >= 20 || h < 4 ? 'home' : 'present'; };

const Inner = () => {
  const { state } = useApp();
  const { add } = useItems();
  const [mode, setMode] = useState<Mode>(startMode);
  const [pulse, setPulse] = useState(false);
  const [typing, setTyping] = useState(false);
  const [dump, setDump] = useState(false);
  const go = (m: Mode) => { if (m !== mode) haptic(6); setMode(m); setPulse(false); setTyping(false); };
  const answered = Object.keys(state.days[todayStr()]?.answers ?? {}).length;
  const done = answered >= state.config.daily_questions.length;

  const right = mode === 'present'
    ? <button className={`pill press ${done ? 'done' : 'brass'}`} onClick={() => setPulse(true)}>
        <svg width="13" height="13" viewBox="0 0 24 24" aria-hidden><path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" fill="currentColor" opacity=".85" /></svg>
        {done ? 'Pulse done' : answered ? `Pulse · ${answered}/10` : 'Evening pulse'}
      </button>
    : <span className="caps" style={{ paddingBottom: 3 }}>{shortDate()}</span>;

  return (
    <div className="omk" data-mode={mode}>
      <Ground mode={mode} />
      <header className="top">
        <span className="title">{mode === 'home' ? 'Omokage' : mode[0].toUpperCase() + mode.slice(1)}{SUB[mode] && <small>{SUB[mode]}</small>}{mode === 'home' && <small style={{ letterSpacing: '.2em' }}>面影</small>}</span>
        {right}
      </header>
      <div className="rule" />
      <main className="body" key={mode}>
        {mode === 'home' && <Home go={go} onPulse={() => { setMode('present'); setPulse(true); }} />}
        {mode === 'past' && <Past typing={typing} setTyping={setTyping} />}
        {mode === 'present' && <Present onDump={() => setDump(true)} />}
        {mode === 'future' && <Future typing={typing} setTyping={setTyping} />}
        {pulse && <PulseFlow onClose={() => setPulse(false)} />}
      </main>
      <nav className="tabs">
        {TABS.map(t => (
          <button key={t.m} className={`tab ${mode === t.m ? 'on' : ''}`} onClick={() => go(t.m)} aria-current={mode === t.m}>
            {t.m === 'home' ? <span className="homeseal"><Glyph mode="home" size={26} /></span> : <Glyph mode={t.m} size={27} />}
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      {dump && <Typing mode="present" heading="Present" prompt="Dump the day. Say it however it comes; dictation works too." chips={['Work', 'Mila', 'Kat', 'tired', 'good day']} placeholder="Rough meeting at two, a nap, a walk with Mila…"
        onCancel={() => setDump(false)} onSave={(t, tags) => { add({ kind: 'past', body: t, board: null, meta: { dump: true, tags } }); setDump(false); }} />}
    </div>
  );
};

export const Omokage = () => <ItemsProvider><Inner /></ItemsProvider>;
