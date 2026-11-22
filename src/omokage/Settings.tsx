import { useState } from 'react';
import { ActionBar } from './Actions';
import { MottoEditor } from './MottoEditor';
import { Sheet } from './Sheet';
import { haptic } from './haptics';
import { INK2, dayNow, getCutoff, setCutoff } from './skins';

const hour = (h: number) => (h === 0 ? 'midnight' : `${h}:00 am`);

/** Opened from the 面影 on Home. Settings live on this device. */
export const Settings = ({ onClose, onChanged }: { onClose: () => void; onChanged: () => void }) => {
  const [cut, setCut] = useState(getCutoff());
  const [mottos, setMottos] = useState(false);
  const set = (h: number) => { const v = Math.max(0, Math.min(8, h)); if (v === cut) return; setCut(v); setCutoff(v); haptic(8); onChanged(); };
  const today = dayNow();
  return (
    <Sheet mode="home">
      <div className="caps" style={{ textAlign: 'center', padding: '12px 0 0' }}>omokage · settings</div>
      <div className="scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '18px 24px 10px' }}>
        <div className="caps" style={{ marginBottom: 6 }}>the day resets at</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 0 10px' }}>
          <button className="chip press" aria-label="Earlier" onClick={() => set(cut - 1)} disabled={cut <= 0} style={{ width: 46, height: 46, padding: 0, fontSize: 22, opacity: cut <= 0 ? .3 : 1 }}>−</button>
          <span className="serif" style={{ fontSize: 34, minWidth: 150, textAlign: 'center' }}>{hour(cut)}</span>
          <button className="chip press" aria-label="Later" onClick={() => set(cut + 1)} disabled={cut >= 8} style={{ width: 46, height: 46, padding: 0, fontSize: 22, opacity: cut >= 8 ? .3 : 1 }}>+</button>
        </div>
        <div className="it" style={{ fontSize: 14.5, lineHeight: 1.5, color: INK2 }}>
          Anything you log before {hour(cut)} still counts toward the day before. Right now that makes today {today.toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}.
        </div>
        <div className="caps" style={{ margin: '28px 0 6px' }}>home</div>
        <button className="todo press" onClick={() => setMottos(true)} style={{ height: 52 }}>
          <span className="it" style={{ fontSize: 16, flex: 1, textAlign: 'left' }}>Edit mottos</span><span style={{ color: INK2 }}>›</span>
        </button>
        <div style={{ fontSize: 12, color: INK2, marginTop: 24, lineHeight: 1.5 }}>Settings are kept on this device.</div>
      </div>
      <ActionBar cancel="Close" onCancel={onClose} />
      {mottos && <MottoEditor onClose={() => setMottos(false)} />}
    </Sheet>
  );
};
