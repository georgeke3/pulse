import { useEffect, useRef, useState } from 'react';
import { addImage, dropImages, useImg, type ImgRef } from './images';
import { Mic } from './Mic';
import { flushDictation, useDictation } from './dictation';
import { Sheet } from './Sheet';
import { INK2, type Mode } from './skins';

/** Writing sheet: prompt stays put at the top, text fills the middle, chips + Save ride the keyboard. */
const Thumb = ({ id, onRemove }: { id: string; onRemove: () => void }) => {
  const [sure, setSure] = useState(false);
  useEffect(() => { if (!sure) return; const t = setTimeout(() => setSure(false), 3000); return () => clearTimeout(t); }, [sure]);
  const u = useImg(id, 'thumb');
  return <span className="th">{u && <img src={u} alt="" />}<b role="button" aria-label={sure ? 'Tap again to remove photo' : 'Remove photo'} onClick={() => (sure ? onRemove() : setSure(true))} style={sure ? { background: '#B5483A', color: '#fff', width: 'auto', padding: '0 6px' } : undefined}>{sure ? 'Remove?' : '✕'}</b></span>;
};

export const Typing = ({ mode, label, prompt, chips, topics, initialTags, initialText, placeholder, photos, initialImages, onSave, onCancel, onDelete }: {
  mode: Mode; label: string; prompt: string; chips?: string[]; initialTags?: string[]; initialText?: string; placeholder?: string;
  /** a big grouped topic list, browsed in a panel instead of a chip row */ topics?: [string, string[]][];
  /** offered (with a second tap to confirm) when editing something that already exists */ onDelete?: () => void;
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
  /** Images on the clipboard: a real image, or an <img>/URL pointing at one (copied from a web page). */
  const clipImages = async (): Promise<Blob[]> => {
    const out: Blob[] = [];
    for (const it of await navigator.clipboard.read()) {
      const ty = it.types.find(x => x.startsWith('image/'));
      if (ty) { out.push(await it.getType(ty)); continue; }
      const html = it.types.includes('text/html') ? await (await it.getType('text/html')).text() : '';
      const txt = it.types.includes('text/plain') ? (await (await it.getType('text/plain')).text()).trim() : '';
      const src = html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1] || (/^https?:\/\/\S+\.(png|jpe?g|gif|webp|heic)(\?\S*)?$/i.test(txt) ? txt : '');
      if (src) { try { const r = await fetch(src); const bl = await r.blob(); if (bl.type.startsWith('image/')) out.push(bl); } catch { /* blocked by the site: skip */ } }
    }
    return out;
  };
  const pasteBtn = async () => {
    setNote(''); setClip(null);
    try {
      const files = await clipImages();
      if (files.length) await attach(files); else setNote('No image on the clipboard. (Copied text? Long-press the text box and Paste.)');
    } catch (e) {
      const n = (e as Error)?.name;
      setNote(n === 'NotAllowedError' ? 'Tap “Paste” when your phone asks. Or long-press the text box and choose Paste.' : `Couldn’t read the clipboard${n ? ` (${n})` : ''}. Long-press the text box and choose Paste.`);
    }
  };
  // Offer a clipboard image as soon as there is one. Only possible where the browser lets pages look without a tap (not iPhone Safari, which asks first).
  const [clip, setClip] = useState<Blob | null>(null);
  const sig = (x: Blob) => `${x.type}:${x.size}`;
  useEffect(() => {
    if (!photos || typeof navigator === 'undefined' || !navigator.clipboard?.read) return;
    let off = false;
    const check = async () => {
      try {
        const p = await navigator.permissions?.query({ name: 'clipboard-read' as PermissionName });
        if (p?.state !== 'granted' || document.visibilityState !== 'visible') return;
        const f = await clipImages();
        if (off || !f.length || sessionStorage.getItem('omk_clip') === sig(f[0])) return;
        setClip(f[0]);
      } catch { /* not allowed to look: stay quiet */ }
    };
    void check();
    window.addEventListener('focus', check); document.addEventListener('visibilitychange', check);
    return () => { off = true; window.removeEventListener('focus', check); document.removeEventListener('visibilitychange', check); };
  }, [photos]); // eslint-disable-line react-hooks/exhaustive-deps
  const takeClip = (add: boolean) => { if (!clip) return; try { sessionStorage.setItem('omk_clip', sig(clip)); } catch { /* ignore */ } const c = clip; setClip(null); if (add) void attach([c]); };
  const onPaste = (e: React.ClipboardEvent) => {
    const files = [...e.clipboardData.files, ...[...e.clipboardData.items].filter(i => i.kind === 'file').map(i => i.getAsFile()).filter((f): f is File => !!f)].filter((f, k, all) => f.type.startsWith('image/') && all.indexOf(f) === k);
    if (photos && files.length) { e.preventDefault(); void attach(files); }
  };
  const removeImg = (id: string) => { setImgs(v => v.filter(x => x.id !== id)); void dropImages([id]); };
  const cancelNow = () => { clearDraft(); if (photos) void dropImages(imgs.map(x => x.id).filter(id => !(initialImages ?? []).some(i => i.id === id))); onCancel(); };
  // an unsaved draft survives a closed sheet, a reload or the app being killed; it is cleared only by Save or a confirmed Discard
  const DK = `omk_draft:${mode}:${label}`, drafts = initialText === undefined && !onDelete;
  const [t, setT] = useState(() => { if (initialText !== undefined) return initialText; try { return localStorage.getItem(DK) ?? ''; } catch { return ''; } });
  const [restored] = useState(() => drafts && t.trim().length > 0);
  useEffect(() => { if (!drafts) return; try { if (t.trim()) localStorage.setItem(DK, t); else localStorage.removeItem(DK); } catch { /* storage full */ } }, [t]); // eslint-disable-line react-hooks/exhaustive-deps
  const clearDraft = () => { try { localStorage.removeItem(DK); } catch { /* ignore */ } };
  const dict = useDictation();
  const [saving, setSaving] = useState(false);
  const [saveErr, setSaveErr] = useState('');
  const save = async () => {
    if (saving) return;
    let text = t;
    if (dict.phase !== 'idle') {                       // Save pressed mid-recording / mid-transcription: finish it first, then save everything
      setSaving(true); setSaveErr('');
      try { const tail = await flushDictation(); if (tail) text = text.trim() ? `${text.trimEnd()} ${tail}` : tail; }
      catch (e) { setSaving(false); setSaveErr(`${(e as Error).message} Nothing was saved yet.`); return; }
      setSaving(false);
    }
    if (!text.trim() && !imgs.length) return;
    clearDraft(); onSave(text.trim(), tags, imgs);
  };
  const [tags, setTags] = useState<string[]>(initialTags ?? []);
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const id = setTimeout(() => setArmed(false), 3500); return () => clearTimeout(id); }, [armed]);
  const dirty = t.trim() !== (initialText ?? '').trim() || tags.join('|') !== (initialTags ?? []).join('|') || imgs.map(x => x.id).join('|') !== (initialImages ?? []).map(x => x.id).join('|');
  const cancel = () => (dirty && !armed ? setArmed(true) : cancelNow());
  const ta = useRef<HTMLTextAreaElement>(null);
  const [browsing, setBrowsing] = useState(false);
  const [sure, setSure] = useState(false);
  useEffect(() => { const id = setTimeout(() => ta.current?.focus(), 80); return () => clearTimeout(id); }, []);
  const flipTag = (c: string) => setTags(v => (v.includes(c) ? v.filter(x => x !== c) : [...v, c]));
  const openTopics = () => { ta.current?.blur(); setBrowsing(true); };
  const closeTopics = () => { setBrowsing(false); setTimeout(() => ta.current?.focus(), 40); };
  const ok = (t.trim().length > 0 || imgs.length > 0 || dict.phase !== 'idle') && !busy && !saving;
  return (
    <Sheet mode={mode}>
      <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 22px 0', fontSize: 14, color: INK2 }}>
        <span style={{ width: 70 }} />
        <span className="caps">{label}</span>
        {onDelete
          ? <button className="press" onMouseDown={e => e.preventDefault()} onClick={() => (sure ? onDelete() : setSure(true))} style={{ width: 70, textAlign: 'right', fontSize: 12.5, color: sure ? '#A8323E' : INK2, fontWeight: sure ? 600 : 400 }}>{sure ? 'Tap to delete' : 'Delete'}</button>
          : <span style={{ width: 70 }} />}
      </div>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 14, padding: '18px 24px 10px' }}>
        <div className="it" style={{ fontSize: 22, lineHeight: 1.3, color: INK2 }}>{prompt}</div>
        {browsing && topics && (
          <div className="scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', margin: '0 -24px', padding: '0 24px 8px' }}>
            {topics.map(([g, list]) => (
              <div key={g} style={{ marginBottom: 14 }}>
                <div className="caps" style={{ marginBottom: 7 }}>{g}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {list.map(c => <button key={c} className={`chip ${tags.includes(c) ? 'on' : ''}`} style={{ height: 34 }} onClick={() => flipTag(c)}>{c}</button>)}
                </div>
              </div>
            ))}
          </div>
        )}
        <textarea ref={ta} value={t} style={browsing ? { display: 'none' } : undefined} onChange={e => setT(e.target.value)} onPaste={onPaste} placeholder={placeholder ?? 'Write freely…'} aria-label={prompt} />
      </div>
      {(restored || saveErr) && <div role={saveErr ? 'alert' : undefined} style={{ position: 'relative', padding: '0 24px 6px', fontSize: 12.5, color: saveErr ? '#A8323E' : INK2 }}>{saveErr || 'Picked up your unsaved draft.'}</div>}
      {photos && (
        <>
          {clip && (
            <div role="status" style={{ position: 'relative', margin: '0 16px 6px', padding: '8px 8px 8px 14px', display: 'flex', alignItems: 'center', gap: 8, borderRadius: 14, background: '#fff', boxShadow: '0 0 0 1px rgba(43,50,71,.12), 0 6px 16px rgba(43,50,71,.1)', fontSize: 13.5 }}>
              <span style={{ flex: 1 }}>Image on your clipboard</span>
              <button className="ink-btn press" onMouseDown={e => e.preventDefault()} onClick={() => takeClip(true)} style={{ height: 32, padding: '0 14px', fontSize: 13, fontWeight: 600 }}>Add</button>
              <button className="chip press" aria-label="Dismiss" onMouseDown={e => e.preventDefault()} onClick={() => takeClip(false)} style={{ height: 32, width: 32, padding: 0 }}>✕</button>
            </div>
          )}
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
        <button className="chip press" onMouseDown={e => e.preventDefault()} onClick={cancel} style={{ flex: 'none', height: 40, fontSize: 14, ...(armed ? { background: '#B5483A', color: '#fff', boxShadow: 'none' } : {}) }}>{armed ? 'Discard?' : 'Cancel'}</button>
        <div className="scroll" style={{ flex: 1, display: 'flex', gap: 6, overflowX: 'auto' }}>
          {topics && <button className="chip press" style={{ flex: 'none', height: 32, gap: 4, background: browsing ? '#2B3247' : '#fff', color: browsing ? '#fff' : undefined }} onMouseDown={e => e.preventDefault()} onClick={browsing ? closeTopics : openTopics}>{browsing ? 'Done' : `# Topics${tags.length ? ` · ${tags.length}` : ''}`}</button>}
          {topics && tags.map(c => <button key={c} className="chip on" style={{ flex: 'none', height: 32 }} onMouseDown={e => e.preventDefault()} onClick={() => flipTag(c)}>{c} ✕</button>)}
          {(chips ?? []).map(c => {
            const on = tags.includes(c);
            return <button key={c} className={`chip ${on ? 'on' : ''}`} style={{ flex: 'none', height: 32 }} onMouseDown={e => e.preventDefault()} onClick={() => setTags(v => (on ? v.filter(x => x !== c) : [...v, c]))}>{c}</button>;
          })}
        </div>
        <Mic size={40} onText={x => setT(v => (v.trim() ? `${v.trimEnd()} ${x}` : x))} />
        <button className="ink-btn press" onMouseDown={e => e.preventDefault()} onClick={() => ok && void save()} style={{ height: 40, padding: '0 20px', fontSize: 14, fontWeight: 600, opacity: ok ? 1 : .35 }}>{saving ? 'Finishing…' : 'Save'}</button>
      </div>
    </Sheet>
  );
};
