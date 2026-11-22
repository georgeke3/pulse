import { useRef, useState } from 'react';
import { INK2 } from './skins';
import { haptic } from './haptics';
import { nav, useNavInfo } from './nav';

/** The browser-style ‹ › that lives in the header's free space. ‹ names where you came from; hold it for the whole trail. */
export const NavBar = () => {
  const n = useNavInfo();
  const [trail, setTrail] = useState<string[] | null>(null);
  const t = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  if (!n.showBack && !n.canForward) return null;
  const down = () => { held.current = false; t.current = setTimeout(() => { held.current = true; haptic(12); setTrail(n.trailLabels()); }, 420); };
  const up = () => { if (t.current) clearTimeout(t.current); };
  return (
    <div style={{ position: 'absolute', left: 24, right: 22, top: 'calc(var(--top) - 6px)', height: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 6 }}>
      {n.showBack
        ? <button className="press" aria-label={`Back to ${n.backLabel}`} onPointerDown={down} onPointerUp={up} onPointerLeave={up} onPointerCancel={up}
            onClick={() => { if (held.current) { held.current = false; return; } haptic(6); nav.back(); }} style={{ fontSize: 13, color: INK2, padding: '4px 0', whiteSpace: 'nowrap', maxWidth: '70%', overflow: 'hidden', textOverflow: 'ellipsis' }}>‹ {n.backLabel}</button>
        : <span />}
      {n.canForward && <button className="press" aria-label={`Forward to ${n.forwardLabel}`} onClick={() => { haptic(6); nav.forward(); }} style={{ fontSize: 13, color: INK2, opacity: .65, padding: '4px 0' }}>{n.forwardLabel} ›</button>}
      {trail && (
        <>
          <div className="backdrop" style={{ position: 'fixed', inset: 0, zIndex: 30 }} onClick={() => setTrail(null)} />
          <div style={{ position: 'absolute', left: 0, top: 28, zIndex: 31, background: '#fff', borderRadius: 14, boxShadow: '0 0 0 1px rgba(43,50,71,.1),0 12px 30px rgba(43,50,71,.16)', padding: '6px 4px', minWidth: 170 }}>
            {trail.map((l, i) => {
              const last = i === trail.length - 1;
              return <button key={i} className="irow press" disabled={last} onClick={() => { setTrail(null); haptic(8); for (let k = trail.length - 1; k > i; k--) nav.back(); }} style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 14px', fontSize: 14, fontWeight: last ? 500 : 400, color: last ? '#2B3247' : INK2 }}>{l}{last ? '  ·  here' : ''}</button>;
            }).reverse()}
          </div>
        </>
      )}
    </div>
  );
};
