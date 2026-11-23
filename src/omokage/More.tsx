import { useMemo, useState } from 'react';
import { haptic } from './haptics';
import { ActionBar } from './Actions';
import { Sheet } from './Sheet';
import { Face } from './Circles';
import { findIcons } from './icons';
import { INK2 } from './skins';
import { labelOf, type Stimulus } from './stimuli';

/** Circles that aren't pinned to the ring. Pick one and it joins today's ring as a guest. */
export const More = ({ circles, onPick, onClose }: { circles: Stimulus[]; onPick: (s: Stimulus) => void; onClose: () => void }) => {
  const [q, setQ] = useState('');
  const rows = useMemo(() => {
    const t = q.trim().toLowerCase(); if (!t) return circles;
    const keys = new Set(findIcons(t, 12).map(i => i.key));
    return circles.filter(s => s.name.toLowerCase().includes(t) || labelOf(s).toLowerCase().includes(t) || keys.has(s.icon));
  }, [q, circles]);
  return (
    <Sheet mode="present" still>
      <div className="cm-head"><span className="serif" style={{ fontSize: 24 }}>More circles</span></div>
      <div className="cm-body">
        <input className="cm-input" style={{ margin: '4px 0 6px' }} value={q} onChange={e => setQ(e.target.value)} placeholder="Search your circles" aria-label="Search circles" autoCapitalize="none" autoCorrect="off" />
        <p className="cm-note">Pick one to log it. It joins today's ring, then steps back here tomorrow unless you keep it.</p>
        {([['training', 'Load'], ['recovery', 'Rest']] as const).map(([t, title]) => {
          const list = rows.filter(s => s.type === t); if (!list.length) return null;
          return (
            <section key={t}>
              <div className="cm-sec"><span className="caps">{title}</span></div>
              {list.map(s => (
                <div key={s.id} className="cm-row">
                  <button className="cm-main press" onClick={() => { haptic(8); onPick(s); }}>
                    <Face s={s} size={38} />
                    <span className="cm-name">{s.name}<small>{labelOf(s)}</small></span>
                    <span style={{ color: INK2 }}>›</span>
                  </button>
                </div>
              ))}
            </section>
          );
        })}
        {!rows.length && <p className="cm-note">{q.trim() ? 'No circle matches that.' : 'Everything is already on your ring.'}</p>}
      </div>
      <ActionBar cancel="Close" onCancel={onClose} />
    </Sheet>
  );
};
