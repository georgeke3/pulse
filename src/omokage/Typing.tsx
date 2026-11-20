import { useEffect, useRef, useState } from 'react';
import { SANS, SERIF, SKINS, type Mode } from './skins';

/** Full-screen typing sheet. Header + prompt stay at the top; Save/Skip ride the keyboard edge (visualViewport). */
export const Typing = ({ mode, heading, prompt, chips, initial, onSave, onCancel }: { mode: Mode; heading: string; prompt: string; chips?: string[]; initial?: string; onSave: (t: string) => void; onCancel: () => void }) => {
  const S = SKINS[mode];
  const [t, setT] = useState(initial ?? '');
  const [vv, setVv] = useState<{ h: number; top: number }>({ h: window.innerHeight, top: 0 });
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const v = window.visualViewport;
    const f = () => { setVv({ h: v ? v.height : window.innerHeight, top: v ? v.offsetTop : 0 }); window.scrollTo(0, 0); };
    f(); v?.addEventListener('resize', f); v?.addEventListener('scroll', f);
    ta.current?.focus();
    return () => { v?.removeEventListener('resize', f); v?.removeEventListener('scroll', f); };
  }, []);
  return (
    <div style={{ position: 'fixed', left: 0, right: 0, top: vv.top, height: vv.h, maxWidth: 520, margin: '0 auto', background: S.bg, color: S.ink, fontFamily: SANS, zIndex: 50, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ height: 'calc(40px + env(safe-area-inset-top))', padding: 'env(safe-area-inset-top) 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', boxSizing: 'border-box', flex: 'none' }}>
        <span style={{ fontFamily: SERIF, fontSize: 24 }}>{heading}</span><span style={{ fontSize: 12, color: S.mute, paddingBottom: 4 }}>typing</span>
      </div>
      <div style={{ padding: '6px 16px', display: 'flex', flexDirection: 'column', gap: 10, flex: 1, minHeight: 0 }}>
        <div style={{ fontFamily: SERIF, fontSize: 19, lineHeight: 1.35 }}>{prompt}</div>
        <textarea ref={ta} value={t} onChange={e => setT(e.target.value)} style={{ flex: 1, minHeight: 0, resize: 'none', border: `1.5px dashed ${S.dash}`, borderRadius: '6px 14px 8px 12px', background: S.card, padding: 10, fontSize: 16, fontFamily: SANS, color: S.ink, outline: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 8 }}>
          <div style={{ flex: 1, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {(chips ?? []).map(c => <button key={c} onClick={() => setT(x => (x && !x.endsWith(' ') && !x.endsWith('\n') ? x + ' ' : x) + c + ' ')} style={{ padding: '6px 11px', borderRadius: 99, border: 0, fontSize: 13, background: S.chip, color: S.chipInk, fontFamily: 'inherit' }}>{c}</button>)}
          </div>
          <button onClick={onCancel} style={{ height: 40, padding: '0 14px', borderRadius: 10, border: 0, background: 'none', color: S.mute, fontSize: 14, fontFamily: 'inherit' }}>Skip</button>
          <button onClick={() => t.trim() && onSave(t.trim())} style={{ height: 40, padding: '0 20px', borderRadius: 10, border: 0, background: S.ink, color: S.bg.startsWith('#') ? S.bg : '#F2EEE6', fontSize: 14, fontFamily: 'inherit', opacity: t.trim() ? 1 : .4 }}>Save</button>
        </div>
      </div>
    </div>
  );
};
