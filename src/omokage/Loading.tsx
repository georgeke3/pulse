import { useEffect, useState, type ReactNode } from 'react';
import head from './assets/dr-splithead.png';
import tail from './assets/dr-splittail.png';
import hook from './assets/dr-hook.png';

const INK = '#2B3247', INK2 = '#646B7E';
const CSS = `
@keyframes omk-bob{0%,100%{transform:translateY(0) rotate(-1deg)}50%{transform:translateY(-8px) rotate(1deg)}}
@keyframes omk-sway{0%,100%{transform:translateX(-5px) rotate(-3deg);opacity:.75}50%{transform:translateX(5px) rotate(3deg);opacity:1}}
@keyframes omk-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion: reduce){.omk-a{animation:none !important}}
`;

const BG = '#F6F3EE';
/** Full-bleed ground. In an iOS home-screen app the layout viewport can come up ~60pt short of the screen, so size from the screen itself and paint the page behind it. */
const Ground = ({ children }: { children: ReactNode }) => {
  const [h, setH] = useState<number | null>(null);
  useEffect(() => {
    const standalone = (navigator as Navigator & { standalone?: boolean }).standalone === true || window.matchMedia('(display-mode: standalone)').matches;
    const fit = () => setH(standalone && window.innerHeight > window.innerWidth ? Math.max(window.innerHeight, window.screen.height) : null);
    fit(); window.addEventListener('resize', fit); window.addEventListener('orientationchange', fit);
    const hb = document.documentElement.style.background, bb = document.body.style.background;
    document.documentElement.style.background = BG; document.body.style.background = BG;
    return () => { window.removeEventListener('resize', fit); window.removeEventListener('orientationchange', fit); document.documentElement.style.background = hb; document.body.style.background = bb; };
  }, []);
  return (
    <div style={{ position: 'fixed', boxSizing: 'border-box', top: 0, left: 0, right: 0, ...(h ? { height: h } : { bottom: 0 }), display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 32, textAlign: 'center', background: `radial-gradient(120% 80% at 50% 30%, #FFFFFF 0%, ${BG} 70%, #EFEBE5 100%)`, color: INK }}>
      <style>{CSS}</style>
      {children}
    </div>
  );
};

/** The final-stage dragon, head and tail drifting apart: the loading screen. */
export const Loading = ({ label = 'one moment…' }: { label?: string }) => (
  <Ground>
    <div style={{ position: 'relative', width: 190, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }} aria-hidden="true">
      <img className="omk-a" src={head} alt="" draggable={false} style={{ width: 170, height: 'auto', animation: 'omk-bob 3s ease-in-out infinite' }} />
      <img className="omk-a" src={tail} alt="" draggable={false} style={{ width: 139, height: 'auto', animation: 'omk-sway 3.6s ease-in-out infinite' }} />
    </div>
    <div role="status" className="omk-a" style={{ fontFamily: 'Lora, serif', fontStyle: 'italic', fontSize: 16, color: INK2, animation: 'omk-in .6s .2s both' }}>{label}</div>
  </Ground>
);

/** Sign-in screen in the same White wind world. */
export const SignIn = ({ busy, error, onSignIn }: { busy: boolean; error: string | null; onSignIn: () => void }) => (
  <Ground>
    <img className="omk-a" src={hook} alt="" aria-hidden="true" draggable={false} style={{ width: 128, height: 'auto', animation: 'omk-bob 3.4s ease-in-out infinite' }} />
    <div style={{ animation: 'omk-in .6s both' }} className="omk-a">
      <div style={{ fontFamily: 'Lora, serif', fontSize: 44, fontWeight: 500, letterSpacing: '-.01em' }}>Omokage <span style={{ fontSize: 16, color: INK2, letterSpacing: '.1em' }}>面影</span></div>
      <div style={{ fontFamily: 'Lora, serif', fontStyle: 'italic', fontSize: 16, color: INK2, marginTop: 6 }}>what was · what is · what may be</div>
    </div>
    <button onClick={onSignIn} disabled={busy} style={{ marginTop: 14, height: 54, minWidth: 240, padding: '0 28px', borderRadius: 27, background: INK, color: '#fff', fontFamily: 'Lora, serif', fontStyle: 'italic', fontSize: 17, border: 0, boxShadow: '0 10px 26px rgba(43,50,71,.22)', opacity: busy ? .55 : 1 }}>
      {busy ? 'Opening Google…' : 'Continue with Google'}
    </button>
    {error && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#A8323E', maxWidth: 300, wordBreak: 'break-word', margin: 0 }}>{error}</p>}
    <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 11, color: INK2, margin: 0 }}>Your data is stored privately in your own account.</p>
  </Ground>
);

/** Offline / sync-problem state: the same world, with a retry. */
export const SyncNotice = ({ label, error, onRetry, onSignOut }: { label: string; error: string | null; onRetry: () => void; onSignOut: () => void }) => {
  const btn = { height: 46, padding: '0 22px', borderRadius: 23, fontFamily: 'Lora, serif', fontStyle: 'italic', fontSize: 16, border: 0 } as const;
  return (
    <Ground>
      <img className="omk-a" src={hook} alt="" aria-hidden="true" draggable={false} style={{ width: 110, height: 'auto', animation: 'omk-bob 3.4s ease-in-out infinite' }} />
      <div style={{ fontFamily: 'Lora, serif', fontStyle: 'italic', fontSize: 18 }}>{label}</div>
      {error && <p style={{ fontFamily: 'Inter, sans-serif', fontSize: 12, color: '#A8323E', maxWidth: 300, wordBreak: 'break-word', margin: 0 }}>{error}</p>}
      <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
        <button onClick={onRetry} style={{ ...btn, background: INK, color: '#fff' }}>Retry</button>
        <button onClick={onSignOut} style={{ ...btn, background: '#fff', color: INK, boxShadow: '0 0 0 1px rgba(43,50,71,.16)' }}>Sign out</button>
      </div>
    </Ground>
  );
};
