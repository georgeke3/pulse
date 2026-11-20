import { useState } from 'react';
import { Future } from './Future';
import { Home } from './Home';
import { ItemsProvider, useItems } from './items';
import { Past } from './Past';
import { Present } from './Present';
import { PulseFlow } from './Pulse';
import { Screen } from './Shell';
import { Typing } from './Typing';
import { longDate, type Mode } from './skins';

const Inner = () => {
  const [mode, setMode] = useState<Mode>('present');
  const [pulse, setPulse] = useState(false);
  const [typing, setTyping] = useState(false);
  const [dump, setDump] = useState(false);
  const { add } = useItems();
  const go = (m: Mode) => { setMode(m); setPulse(false); setTyping(false); };
  const right = mode === 'present' ? <button onClick={() => setPulse(true)} style={{ background: 'none', border: '1px solid #9C7B3C', color: '#9C7B3C', borderRadius: 99, padding: '3px 10px', fontSize: 12, fontFamily: 'inherit' }}>Evening pulse</button> : longDate();
  const titles: Record<Mode, string> = { home: 'Home', past: 'Past', present: 'Present', future: 'Future' };
  return (
    <>
      <Screen mode={mode} title={titles[mode]} right={right} onTab={go} overlay={pulse ? <PulseFlow onClose={() => setPulse(false)} /> : undefined}>
        {mode === 'home' && <Home go={go} onPulse={() => { setMode('present'); setPulse(true); }} />}
        {mode === 'past' && <Past typing={typing} setTyping={setTyping} />}
        {mode === 'present' && <Present onDump={() => setDump(true)} />}
        {mode === 'future' && <Future typing={typing} setTyping={setTyping} />}
      </Screen>
      {dump && <Typing mode="past" heading="Dump the day" prompt="Rough meeting at two, a nap, a walk… say it however it comes." onCancel={() => setDump(false)} onSave={t => { add({ kind: 'past', body: t, board: null, meta: { dump: true } }); setDump(false); }} />}
    </>
  );
};
export const Omokage = () => <ItemsProvider><Inner /></ItemsProvider>;
