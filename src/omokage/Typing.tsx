import { useEffect, useRef, useState } from 'react';
import { Mic } from './Mic';
import { Sheet } from './Sheet';
import { INK2, type Mode } from './skins';

/** Writing sheet: prompt stays put at the top, text fills the middle, chips + Save ride the keyboard. */
export const Typing = ({ mode, label, prompt, chips, initialTags, placeholder, onSave, onCancel }: {
  mode: Mode; label: string; prompt: string; chips?: string[]; initialTags?: string[]; placeholder?: string;
  onSave: (t: string, tags: string[]) => void; onCancel: () => void;
}) => {
  const [t, setT] = useState('');
  const [tags, setTags] = useState<string[]>(initialTags ?? []);
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const id = setTimeout(() => ta.current?.focus(), 80); return () => clearTimeout(id); }, []);
  const ok = t.trim().length > 0;
  return (
    <Sheet mode={mode}>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 22px 0', fontSize: 14, color: INK2 }}>
        <span style={{ width: 1 }} />
        <span className="caps">{label}</span>
        <span style={{ width: 1 }} />
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 24px 10px' }}>
        <div className="it" style={{ fontSize: 22, lineHeight: 1.3, color: INK2 }}>{prompt}</div>
        <textarea ref={ta} value={t} onChange={e => setT(e.target.value)} placeholder={placeholder ?? 'Write freely…'} aria-label={prompt} />
      </div>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px calc(8px + var(--sb))', background: 'rgba(255,255,255,.55)', boxShadow: '0 -1px 0 rgba(43,50,71,.08)' }}>
        <button className="chip press" style={{ flex: 'none', height: 40, fontSize: 14 }} onMouseDown={e => e.preventDefault()} onClick={onCancel}>Cancel</button>
        <div className="scroll" style={{ flex: 1, display: 'flex', gap: 6, overflowX: 'auto' }}>
          {(chips ?? []).map(c => {
            const on = tags.includes(c);
            return <button key={c} className={`chip ${on ? 'on' : ''}`} style={{ flex: 'none', height: 32 }} onMouseDown={e => e.preventDefault()} onClick={() => setTags(v => (on ? v.filter(x => x !== c) : [...v, c]))}>{c}</button>;
          })}
        </div>
        <Mic size={40} onText={x => setT(v => (v.trim() ? `${v.trimEnd()} ${x}` : x))} />
        <button className="ink-btn press" onMouseDown={e => e.preventDefault()} onClick={() => ok && onSave(t.trim(), tags)} style={{ height: 40, padding: '0 20px', fontSize: 14, fontWeight: 600, opacity: ok ? 1 : .35 }}>Save</button>
      </div>
    </Sheet>
  );
};
