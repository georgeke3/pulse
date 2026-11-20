import { useEffect, useRef, useState } from 'react';
import { Atmos, Glyph } from './Art';
import { Future } from './Future';
import { haptic } from './haptics';
import { Home } from './Home';
import { ItemsProvider, useItems } from './items';
import { Past } from './Past';
import { Present } from './Present';
import { PulseFlow } from './Pulse';
import { Typing } from './Typing';
import { GROUND, INK2, type Mode } from './skins';
import './omokage.css';

const TABS: { m: Mode; label: string }[] = [{ m: 'home', label: 'Home' }, { m: 'past', label: 'Past' }, { m: 'present', label: 'Present' }, { m: 'future', label: 'Future' }];
// Every painted asset is decoded up front, so no tab pops its pictures in late the first time it opens.
const ART = import.meta.glob('./assets/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const warmArt = () => Object.values(ART).forEach(src => { const im = new Image(); im.src = src; void im.decode?.().catch(() => undefined); });

const startMode = (): Mode => { const h = new Date().getHours(); return h >= 20 || h < 4 ? 'home' : 'present'; };

const Inner = () => {
  const { add } = useItems();
  const [mode, setMode] = useState<Mode>(startMode);
  useEffect(() => { warmArt(); }, []);
  const [pulse, setPulse] = useState(false);
  const [typing, setTyping] = useState(false);
  const [dump, setDump] = useState(false);
  const go = (m: Mode) => { if (m !== mode) haptic(6); setMode(m); setPulse(false); setTyping(false); };
  const now = new Date();
  // paint the page itself in the mode's ground, so nothing behind the app can ever show as a band
  useEffect(() => { document.documentElement.style.background = GROUND[mode]; document.body.style.background = GROUND[mode]; }, [mode]);
  // iOS home-screen apps shrink the viewport the first time the keyboard opens and never give it back
  // (bottom bar floats ~59pt high over a dead band). Toggling display on the full-height shell after the
  // keyboard closes makes WebKit re-measure. Only fires when the viewport is actually stuck small.
  const shell = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let maxVH = window.innerHeight;
    const onResize = () => { maxVH = Math.max(maxVH, window.innerHeight); };
    const heal = () => {
      const el = shell.current; if (!el) return;
      const typing = document.activeElement instanceof HTMLInputElement || document.activeElement instanceof HTMLTextAreaElement;
      if (typing || maxVH - window.innerHeight <= 4) return;
      el.style.display = 'none'; void el.offsetHeight; el.style.display = '';
    };
    const onBlur = () => { setTimeout(heal, 150); setTimeout(heal, 600); };
    window.addEventListener('resize', onResize);
    document.addEventListener('focusout', onBlur);
    document.addEventListener('visibilitychange', onBlur);
    return () => { window.removeEventListener('resize', onResize); document.removeEventListener('focusout', onBlur); document.removeEventListener('visibilitychange', onBlur); };
  }, []);
  const sub: Record<Mode, string> = {
    home: '', past: 'what was', future: 'what may be',
    present: `${now.toLocaleDateString('en', { weekday: 'long' })}, the day so far`,
  };

  return (
    <div className="omk" data-mode={mode} ref={shell}>
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
