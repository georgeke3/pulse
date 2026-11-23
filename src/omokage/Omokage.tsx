import { useEffect, useRef, useState } from 'react';
import { Atmos, Glyph } from './Art';
import { Future } from './Future';
import { haptic } from './haptics';
import { Home } from './Home';
import { ItemsProvider, useItems } from './items';
import { Past } from './Past';
import { Present } from './Present';
import { StimuliProvider } from './stimuli';
import { PulseFlow } from './Pulse';
import { Typing } from './Typing';
import { GROUND, INK2, dayNow, fromDstr, todayStr, type Mode } from './skins';
import { Settings } from './Settings';
import { NavBar } from './NavBar';
import { nav, useNavInfo, useNavState } from './nav';
import { useApp } from '../store';
import './omokage.css';

const TABS: { m: Mode; label: string }[] = [{ m: 'home', label: 'Home' }, { m: 'past', label: 'Past' }, { m: 'present', label: 'Present' }, { m: 'future', label: 'Future' }];
// Every painted asset is decoded up front, so no tab pops its pictures in late the first time it opens.
const ART = import.meta.glob('./assets/*.png', { eager: true, import: 'default' }) as Record<string, string>;
const warmArt = () => Object.values(ART).forEach(src => { const im = new Image(); im.src = src; void im.decode?.().catch(() => undefined); });


const Inner = () => {
  const { items, remove } = useItems();
  const { state, updateDayNote } = useApp();
  const [mode] = useNavState<Mode>('mode', 'home');
  // Present normally shows today; Home can open it on an earlier day (cleared whenever you leave Present)
  const [pday, setPday] = useNavState<string | null>('present.pday', null, 'replace');
  const day = pday ?? todayStr();
  // "Dump the day" used to save a loose Past entry. It is the day's summary now (the day note, synced with the day):
  // fold any old dumps into their day's note once, then drop them.
  useEffect(() => {
    const old = items.filter(i => i.kind === 'past' && i.meta?.dump);
    for (const i of old) {
      const cur = state.days[i.day]?.note?.trim() ?? '';
      if (!cur.includes(i.body.trim())) updateDayNote(i.day, cur ? `${cur}\n\n${i.body.trim()}` : i.body.trim());
      remove(i.id);
    }
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { warmArt(); }, []);
  const [pulse, setPulse] = useNavState<{ day?: string } | null>('app.pulse', null);
  const [settings, setSettings] = useNavState('app.settings', false);
  const [tick, setTick] = useState(0);
  const [dump, setDump] = useNavState('app.dump', false);
  // jump to a place with its state preset (a day's full page, an answer, a pin…); ‹ returns here exactly
  const go = (m: Mode, patch?: Record<string, unknown>) => { haptic(6); nav.go(m, patch); };
  const now = dayNow();
  // paint the page itself in the mode's ground, so nothing behind the app can ever show as a band
  useEffect(() => { document.documentElement.style.background = GROUND[mode]; document.body.style.background = GROUND[mode]; }, [mode]);
  // iOS home-screen apps shrink the viewport the first time the keyboard opens and never give it back
  // (bottom bar floats ~59pt high over a dead band). Toggling display on the full-height shell after the
  // keyboard closes makes WebKit re-measure. Only fires when the viewport is actually stuck small.
  const shell = useRef<HTMLDivElement>(null);
  // Installed iOS apps sometimes come back with a viewport ~60pt short (after a reload, or after the keyboard). Fixed
  // and 100dvh layouts then float the tab bar over a dead band. In the installed app, size the shell from the
  // screen itself instead, and pin the tab bar inside it, so a short viewport can't move anything.
  const standalone = typeof navigator !== 'undefined' && ((navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches);
  const [fullH, setFullH] = useState<number | null>(null);
  useEffect(() => {
    if (!standalone) return;
    const f = () => setFullH(window.innerHeight > window.innerWidth ? Math.max(window.innerHeight, window.screen.height, window.screen.width) : null);
    f();
    ['resize', 'orientationchange', 'pageshow', 'focusout'].forEach(ev => window.addEventListener(ev, f));
    document.addEventListener('visibilitychange', f);
    return () => { ['resize', 'orientationchange', 'pageshow', 'focusout'].forEach(ev => window.removeEventListener(ev, f)); document.removeEventListener('visibilitychange', f); };
  }, [standalone]);
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
  const ni = useNavInfo();
  // left-edge swipe = ‹ (native touch events, so scrolling children can't cancel it)
  const backOk = useRef(false); backOk.current = ni.showBack;
  useEffect(() => {
    let s: { x: number; y: number } | null = null;
    const down = (e: TouchEvent) => { const t = e.touches[0]; s = t && t.clientX < 28 ? { x: t.clientX, y: t.clientY } : null; };
    const up = (e: TouchEvent) => { const t = e.changedTouches[0]; const a = s; s = null; if (!a || !t || !backOk.current) return; const dx = t.clientX - a.x, dy = t.clientY - a.y; if (dx > 64 && dx > Math.abs(dy) * 1.5) { haptic(6); nav.back(); } };
    document.addEventListener('touchstart', down, { passive: true }); document.addEventListener('touchend', up, { passive: true });
    return () => { document.removeEventListener('touchstart', down); document.removeEventListener('touchend', up); };
  }, []);
  const sub: Record<Mode, string> = {
    home: '', past: 'what was', future: 'what may be',
    present: pday ? `${fromDstr(pday).toLocaleDateString('en', { weekday: 'long' })}, looking back` : `${now.toLocaleDateString('en', { weekday: 'long' })}, the day so far`,
  };

  return (
    <div className="omk" data-mode={mode} ref={shell} style={fullH ? { height: fullH, ['--bot' as string]: 'max(env(safe-area-inset-bottom), 28px)' } : undefined} data-pinned={fullH ? '1' : undefined}>
      <Atmos mode={mode} />
      <NavBar />
      <header className="top" style={ni.row ? { paddingTop: 'calc(var(--top) + 46px)', minHeight: 'calc(var(--top) + 90px)' } : undefined}>
        {mode === 'home'
          ? <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}><span className="t">Omokage</span><button className="press" onClick={() => { haptic(6); setSettings(true); }} aria-label="Settings" style={{ fontSize: 13, color: INK2, letterSpacing: '.3em', padding: '8px 6px 8px 0' }}>面影</button></span>
          : <span className="t">{mode[0].toUpperCase() + mode.slice(1)}</span>}
        <span className="s">{sub[mode]}</span>
      </header>
      <main className="body" key={mode + tick}>
        {mode === 'home' && <Home go={go} onPulse={d => setPulse({ day: d })} />}
        {mode === 'past' && <Past />}
        {mode === 'present' && <Present day={day} onExitDay={() => setPday(null)} onDump={() => setDump(true)} onPulse={() => setPulse({})} />}
        {mode === 'future' && <Future />}
      </main>
      <nav className="tabs">
        {TABS.map(t => (
          <button key={t.m} className={`tab ${mode === t.m ? 'on' : ''}`} onClick={() => { if (mode !== t.m) haptic(6); nav.tab(t.m); }} aria-current={mode === t.m ? 'page' : undefined}>
            <span className="ic"><Glyph mode={t.m} on={mode === t.m} /></span>{t.label}
          </button>
        ))}
      </nav>
      {settings && <Settings onClose={() => setSettings(false)} onChanged={() => setTick(t => t + 1)} />}
      {pulse && <PulseFlow day={pulse.day ?? (mode === 'present' ? day : undefined)} onClose={() => setPulse(null)} />}
      {dump && <Typing mode="present" label={`present · ${state.days[day]?.note?.trim() ? 'the day, told' : 'dump the day'}`} initialText={state.days[day]?.note ?? ''}
        prompt={state.days[day]?.note?.trim() ? 'The day so far. Change anything, add the rest.' : 'Say it however it comes. Dictation works too.'} placeholder="Rough meeting at two, a nap, a walk with Mila…"
        onCancel={() => setDump(false)} onSave={t => { updateDayNote(day, t); setDump(false); }} />}
    </div>
  );
};

export const Omokage = () => <ItemsProvider><StimuliProvider><Inner /></StimuliProvider></ItemsProvider>;
