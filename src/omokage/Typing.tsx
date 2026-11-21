import { useEffect, useRef, useState } from 'react';
import { addImage, dropImages, useImg, type ImgRef } from './images';
import { Mic } from './Mic';
import { Sheet } from './Sheet';
import { INK2, type Mode } from './skins';

/** Writing sheet: prompt stays put at the top, text fills the middle, chips + Save ride the keyboard. */
const Thumb = ({ id, onRemove }: { id: string; onRemove: () => void }) => {
  const u = useImg(id, 'thumb');
  return <span className="th">{u && <img src={u} alt="" />}<b role="button" aria-label="Remove photo" onClick={onRemove}>✕</b></span>;
};

export const Typing = ({ mode, label, prompt, chips, initialTags, initialText, placeholder, photos, initialImages, onSave, onCancel }: {
  mode: Mode; label: string; prompt: string; chips?: string[]; initialTags?: string[]; initialText?: string; placeholder?: string;
  /** Offer photo attach (album picker, paste); onSave then also receives the photos. */
  photos?: boolean; initialImages?: ImgRef[];
  onSave: (t: string, tags: string[], imgs: ImgRef[]) => void; onCancel: () => void;
}) => {
  const [imgs, setImgs] = useState<ImgRef[]>(initialImages ?? []);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');
  const pick = useRef<HTMLInputElement>(null);
  const attach = async (files: Blob[]) => {
    if (!files.length) return;
    setBusy(true); setNote('');
    try { const got: ImgRef[] = []; for (const f of files) got.push(await addImage(f)); setImgs(v => [...v, ...got]); }
    catch { setNote('Could not read that image.'); }
    setBusy(false);
  };
  const pasteBtn = async () => {
    setNote('');
    try {
      const items = await navigator.clipboard.read(), files: Blob[] = [];
      for (const it of items) { const ty = it.types.find(x => x.startsWith('image/')); if (ty) files.push(await it.getType(ty)); }
      if (files.length) await attach(files); else setNote('No image on the clipboard.');
    } catch { setNote('Paste isn’t allowed here. Long-press the text box and choose Paste.'); }
  };
  const onPaste = (e: React.ClipboardEvent) => {
    const files = [...e.clipboardData.files].filter(f => f.type.startsWith('image/'));
    if (photos && files.length) { e.preventDefault(); void attach(files); }
  };
  const removeImg = (id: string) => { setImgs(v => v.filter(x => x.id !== id)); void dropImages([id]); };
  const cancel = () => { if (photos) void dropImages(imgs.map(x => x.id).filter(id => !(initialImages ?? []).some(i => i.id === id))); onCancel(); };
  const [t, setT] = useState(initialText ?? '');
  const [tags, setTags] = useState<string[]>(initialTags ?? []);
  const ta = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const id = setTimeout(() => ta.current?.focus(), 80); return () => clearTimeout(id); }, []);
  const ok = (t.trim().length > 0 || imgs.length > 0) && !busy;
  return (
    <Sheet mode={mode}>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 22px 0', fontSize: 14, color: INK2 }}>
        <span style={{ width: 1 }} />
        <span className="caps">{label}</span>
        <span style={{ width: 1 }} />
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 24px 10px' }}>
        <div className="it" style={{ fontSize: 22, lineHeight: 1.3, color: INK2 }}>{prompt}</div>
        <textarea ref={ta} value={t} onChange={e => setT(e.target.value)} onPaste={onPaste} placeholder={placeholder ?? 'Write freely…'} aria-label={prompt} />
      </div>
      {photos && (
        <>
          {note && <div style={{ position: 'relative', padding: '0 24px 6px', fontSize: 12.5, color: INK2 }}>{note}</div>}
          <div className="att" style={{ position: 'relative' }}>
            <input ref={pick} type="file" accept="image/*" multiple hidden onChange={e => { void attach([...(e.target.files ?? [])]); e.target.value = ''; }} />
            <button className="chip press" style={{ flex: 'none', height: 40 }} onMouseDown={e => e.preventDefault()} onClick={() => pick.current?.click()}>{busy ? 'Adding…' : 'Photos'}</button>
            {typeof navigator !== 'undefined' && !!navigator.clipboard?.read && <button className="chip press" style={{ flex: 'none', height: 40 }} onMouseDown={e => e.preventDefault()} onClick={pasteBtn}>Paste image</button>}
            {imgs.map(x => <Thumb key={x.id} id={x.id} onRemove={() => removeImg(x.id)} />)}
          </div>
        </>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px calc(8px + var(--sb))', background: 'rgba(255,255,255,.55)', boxShadow: '0 -1px 0 rgba(43,50,71,.08)' }}>
        <button className="chip press" style={{ flex: 'none', height: 40, fontSize: 14 }} onMouseDown={e => e.preventDefault()} onClick={cancel}>Cancel</button>
        <div className="scroll" style={{ flex: 1, display: 'flex', gap: 6, overflowX: 'auto' }}>
          {(chips ?? []).map(c => {
            const on = tags.includes(c);
            return <button key={c} className={`chip ${on ? 'on' : ''}`} style={{ flex: 'none', height: 32 }} onMouseDown={e => e.preventDefault()} onClick={() => setTags(v => (on ? v.filter(x => x !== c) : [...v, c]))}>{c}</button>;
          })}
        </div>
        <Mic size={40} onText={x => setT(v => (v.trim() ? `${v.trimEnd()} ${x}` : x))} />
        <button className="ink-btn press" onMouseDown={e => e.preventDefault()} onClick={() => ok && onSave(t.trim(), tags, imgs)} style={{ height: 40, padding: '0 20px', fontSize: 14, fontWeight: 600, opacity: ok ? 1 : .35 }}>Save</button>
      </div>
    </Sheet>
  );
};
