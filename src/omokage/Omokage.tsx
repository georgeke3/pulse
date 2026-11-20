import { useState } from 'react';
import { Glyph } from './Glyphs';
import { Home } from './Home';
import { ItemsProvider } from './items';
import { Notes } from './Notes';
import { Present } from './Present';
import { PulseFlow } from './Pulse';
import { SKINS, type Mode } from './skins';

const TABS: { m: Mode; label: string }[] = [{ m: 'home', label: 'Home' }, { m: 'past', label: 'Past' }, { m: 'present', label: 'Present' }, { m: 'future', label: 'Future' }];

export const Omokage = () => {
  const [mode, setMode] = useState<Mode>('present');
  const [pulse, setPulse] = useState(false);
  const S = SKINS[mode];
  return (
    <ItemsProvider>
      <div style={{ position: 'fixed', inset: 0, display: 'flex', flexDirection: 'column', background: S.paper, fontFamily: S.font, transition: 'background .25s', maxWidth: 520, margin: '0 auto', overflow: 'hidden' }}>
        <div style={{ flex: 1, minHeight: 0, position: 'relative', paddingTop: 'env(safe-area-inset-top)' }}>
          {mode === 'home' && <Home />}
          {mode === 'past' && <Notes kind="past" />}
          {mode === 'present' && <Present onPulse={() => setPulse(true)} />}
          {mode === 'future' && <Notes kind="future" />}
          {pulse && <PulseFlow onClose={() => setPulse(false)} />}
        </div>
        <nav style={{ height: 'calc(58px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)', background: S.tabbg, borderTop: `1px solid ${S.line}`, display: 'flex' }}>
          {TABS.map(t => {
            const on = mode === t.m; const c = on ? SKINS[t.m].accent : '#8b8794';
            return (
              <button key={t.m} onClick={() => { setMode(t.m); setPulse(false); }} style={{ flex: 1, border: 0, background: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, color: c, fontFamily: 'inherit', fontSize: 11, letterSpacing: '0.05em' }}>
                <Glyph mode={t.m} color={c} size={t.m === 'home' ? 30 : 24} />
                {t.label}
              </button>
            );
          })}
        </nav>
      </div>
    </ItemsProvider>
  );
};
