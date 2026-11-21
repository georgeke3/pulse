import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Atmos } from './Art';
import type { Mode } from './skins';

/** Full-screen sheet pinned to the visual viewport, so the keyboard never shoves the layout around. */
export const Sheet = ({ mode, children, still }: { mode: Mode; children: ReactNode; still?: boolean }) => {
  const [vv, setVv] = useState({ h: window.innerHeight, top: 0 });
  useEffect(() => {
    if (still) return;
    const v = window.visualViewport;
    const f = () => { setVv({ h: v ? v.height : window.innerHeight, top: v ? v.offsetTop : 0 }); if (window.scrollY) window.scrollTo(0, 0); };
    f(); v?.addEventListener('resize', f); v?.addEventListener('scroll', f);
    return () => { v?.removeEventListener('resize', f); v?.removeEventListener('scroll', f); };
  }, [still]);
  const kb = !still && vv.h < window.innerHeight - 120;
  return createPortal(
    <div className="omk omk-sheet" data-mode={mode} style={kb ? { top: vv.top, bottom: 'auto', height: vv.h, ['--sb' as string]: '0px' } : { top: 0, bottom: 0, ['--sb' as string]: 'var(--bot)' }}>
      <Atmos mode={mode} />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingTop: 'calc(var(--top) + 10px)' }}>{children}</div>
    </div>,
    document.body,
  );
};
