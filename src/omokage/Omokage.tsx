import { useState } from 'react';
import { Atmos, Glyph } from './Art';
import { Future } from './Future';
import { haptic } from './haptics';
import { Home } from './Home';
import { ItemsProvider, useItems } from './items';
import { Past } from './Past';
import { Present } from './Present';
import { PulseFlow } from './Pulse';
import { Typing } from './Typing';
import { INK2, type Mode } from './skins';
import './omokage.css';

const TABS: { m: Mode; label: string }[] = [{ m: 'home', label: 'Home' }, { m: 'past', label: 'Past' }, { m: 'present', label: 'Present' }, { m: 'future', label: 'Future' }];
const startMode = (): Mode => { const h = new Date().getHours(); return h >= 20 || h < 4 ? 'home' : 'present'; };

const Inner = () => {
  const { add } = useItems();
  const [mode, setMode] = useState<Mode>(startMode);
  const [pulse, setPulse] = useState(false);
  const [typing, setTyping] = useState(false);
  const [dump, setDump] = useState(false);
  const go = (m: Mode) => { if (m !== mode) haptic(6); setMode(m); setPulse(false); setTyping(false); };
  const now = new Date();
  const sub: Record<Mode, string> = {
    home: '', past: 'what was', future: 'what may be',
    present: `${now.toLocaleDateString('en', { weekday: 'long' })}, the day so far`,
  };

  return (
    <div className="omk" data-mode={mode}>
      <Atmos mode={mode} />
      <header className="top">
        {mode === 'home'
          ? <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}><span className="t">Omokage</span><span style={{ fontSize: 13, color: INK2, letterSpacing: '.3em' }}>面影</span></span>
          : <span className="t">{mode[0].toUpperCase() + mode.slice(1)}</span>}
        <span className="s">{sub[mode]}</span>
      </header>
      <main className="body" key={mode}>
        {mode === 'home' && <Home go={go} onPulse={() => setPulse(true)} />}
        {mode === 'past' && <Past typing={typing} setTyping={setTyping} />}
        {mode === 'present' && <Present onDump={() => setDump(true)} onPulse={() => setPulse(true)} />}
        {mode === 'future' && <Future typing={typing} setTyping={setTyping} />}
      </main>
      <nav className="tabs">
        {TABS.map(t => (
          <button key={t.m} className={`tab ${mode === t.m ? 'on' : ''}`} onClick={() => go(t.m)} aria-current={mode === t.m ? 'page' : undefined}>
            <span className="ic"><Glyph mode={t.m} on={mode === t.m} /></span>{t.label}
          </button>
        ))}
      </nav>
      {pulse && <PulseFlow onClose={() => setPulse(false)} />}
      {dump && <Typing mode="present" label="present · dump the day" prompt="Say it however it comes. Dictation works too." chips={['Work', 'Mila', 'Kat', 'tired', 'good day']} placeholder="Rough meeting at two, a nap, a walk with Mila…"
        onCancel={() => setDump(false)} onSave={(t, tags) => { add({ kind: 'past', body: t, board: null, meta: { dump: true, tags } }); setDump(false); }} />}
    </div>
  );
};

export const Omokage = () => <ItemsProvider><Inner /></ItemsProvider>;
