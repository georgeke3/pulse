import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { Mode } from './skins';

/**
 * Full-screen writing sheet pinned to the visual viewport: the header and prompt stay put,
 * the text area shrinks, and Save/Skip ride the top edge of the keyboard. Nothing jumps.
 */
export const Typing = ({ mode, heading, prompt, chips, initialTags, placeholder, onSave, onCancel }: {
  mode: Mode; heading: string; prompt: string; chips?: string[]; initialTags?: string[]; placeholder?: string;
  onSave: (t: string, tags: string[]) => void; onCancel: () => void;
}) => {
  const [t, setT] = useState('');
  const [tags, setTags] = useState<string[]>(initialTags ?? []);
  const [vv, setVv] = useState({ h: window.innerHeight, top: 0 });
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const v = window.visualViewport;
    const f = () => { setVv({ h: v ? v.height : window.innerHeight, top: v ? v.offsetTop : 0 }); if (window.scrollY) window.scrollTo(0, 0); };
    f(); v?.addEventListener('resize', f); v?.addEventListener('scroll', f);
    const id = setTimeout(() => ta.current?.focus(), 60);
    return () => { clearTimeout(id); v?.removeEventListener('resize', f); v?.removeEventListener('scroll', f); };
  }, []);
  const card = mode === 'future' ? 'mist' : mode === 'present' ? 'codex' : 'sketch';
  const ok = t.trim().length > 0;
  return createPortal(
    <div className="omk omk-type" data-mode={mode} style={{ top: vv.top, height: vv.h }}>
      <div className="ground g-grad" /><div className="ground g-grain" />
      <div className="top" style={{ zIndex: 2 }}>
        <span className="title">{heading}<small>writing</small></span>
        <button className="press" onClick={onCancel} style={{ fontSize: 13, color: 'var(--fg2)', paddingBottom: 3 }}>Cancel</button>
      </div>
      <div style={{ position: 'relative', zIndex: 2, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 10, padding: '10px 14px 8px' }}>
        <div className="quote" style={{ fontSize: 20, lineHeight: 1.35 }}>{prompt}</div>
        <textarea ref={ta} className={card} value={t} onChange={e => setT(e.target.value)} placeholder={placeholder ?? 'Write freely…'} style={{ background: 'var(--card)', color: 'var(--fg)' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div className="scroll" style={{ flex: 1, display: 'flex', gap: 6, overflowX: 'auto' }}>
            {(chips ?? []).map(c => { const on = tags.includes(c);
              return <button key={c} className={`chip press ${on ? 'on' : ''}`} style={{ flex: 'none', height: 30 }} onMouseDown={e => e.preventDefault()} onClick={() => setTags(v => on ? v.filter(x => x !== c) : [...v, c])}>{c}</button>; })}
          </div>
          <button className="send press" onMouseDown={e => e.preventDefault()} onClick={() => ok && onSave(t.trim(), tags)} style={{ background: 'var(--fg)', color: 'var(--ground)', opacity: ok ? 1 : .35 }}>Save</button>
        </div>
      </div>
    </div>
  , document.body);
};
