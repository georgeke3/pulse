import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Atmos } from './Art';
import type { Mode } from './skins';

/** Full-screen sheet pinned to the visual viewport, so the keyboard never shoves the layout around. */
export const Sheet = ({ mode, children }: { mode: Mode; children: ReactNode }) => {
  const [vv, setVv] = useState({ h: window.innerHeight, top: 0 });
  useEffect(() => {
    const v = window.visualViewport;
    const f = () => { setVv({ h: v ? v.height : window.innerHeight, top: v ? v.offsetTop : 0 }); if (window.scrollY) window.scrollTo(0, 0); };
    f(); v?.addEventListener('resize', f); v?.addEventListener('scroll', f);
    return () => { v?.removeEventListener('resize', f); v?.removeEventListener('scroll', f); };
  }, []);
  return createPortal(
    <div className="omk omk-sheet" data-mode={mode} style={{ top: vv.top, height: vv.h < window.innerHeight - 120 ? vv.h : '100lvh', ['--sb' as string]: vv.h < window.innerHeight - 120 ? '0px' : 'var(--bot)' }}>
      <Atmos mode={mode} />
      <div style={{ position: 'relative', zIndex: 1, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', paddingTop: 'calc(var(--top) + 10px)' }}>{children}</div>
    </div>,
    document.body,
  );
};
