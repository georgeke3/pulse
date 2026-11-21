import { useRef, useState } from 'react';
import { ActionBar } from './Actions';
import { addImage, dropImages, useImg, type ImgRef } from './images';
import { imgsOf, type Item } from './items';
import { Sheet } from './Sheet';
import { INK, INK2 } from './skins';

const Row = ({ r, onCap, onRemove }: { r: ImgRef; onCap: (c: string) => void; onRemove: () => void }) => {
  const u = useImg(r.id, 'thumb');
  return (
    <div style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(43,50,71,.08)' }}>
      <span style={{ width: 64, height: 64, flex: 'none', borderRadius: 8, overflow: 'hidden', background: 'rgba(43,50,71,.08)' }}>{u && <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}</span>
      <input value={r.cap ?? ''} onChange={e => onCap(e.target.value)} placeholder="Add a caption…" aria-label="Caption"
        style={{ flex: 1, minWidth: 0, border: 0, outline: 'none', background: 'transparent', fontFamily: 'Lora, serif', fontStyle: r.cap ? 'normal' : 'italic', fontSize: 15, color: INK }} />
      <button className="press" onClick={onRemove} aria-label="Remove photo" style={{ width: 36, height: 36, borderRadius: 18, flex: 'none', color: INK2, boxShadow: 'inset 0 0 0 1px rgba(43,50,71,.18)' }}>✕</button>
    </div>
  );
};

/** Edit a pinned item: its text, its photos (add, remove, caption). Removed photos are only deleted once you save. */
export const PinEdit = ({ item, onSave, onClose }: { item: Item; onSave: (body: string, imgs: ImgRef[]) => void; onClose: () => void }) => {
  const start = imgsOf(item);
  const [t, setT] = useState(item.body);
  const [imgs, setImgs] = useState<ImgRef[]>(start);
  const [busy, setBusy] = useState(false);
  const pick = useRef<HTMLInputElement>(null);
  const added = (list: ImgRef[]) => list.filter(x => !start.some(s => s.id === x.id)).map(x => x.id);
  const attach = async (files: File[]) => {
    setBusy(true);
    const got: ImgRef[] = []; for (const f of files) { try { got.push(await addImage(f)); } catch { /* skip */ } }
    setImgs(v => [...v, ...got]); setBusy(false);
  };
  const cancel = () => { void dropImages(added(imgs)); onClose(); };
  const save = () => {
    void dropImages(start.filter(s => !imgs.some(x => x.id === s.id)).map(s => s.id));
    onSave(t.trim(), imgs.map(x => (x.cap?.trim() ? { ...x, cap: x.cap.trim() } : { id: x.id, w: x.w, h: x.h })));
  };
  const ok = (t.trim() || imgs.length) && !busy;
  return (
    <Sheet mode="future">
      <div className="caps" style={{ textAlign: 'center', padding: '12px 0 0' }}>future · edit pin</div>
      <div className="scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 24px 10px' }}>
        <textarea value={t} onChange={e => setT(e.target.value)} placeholder="What if…" aria-label="Pin text" style={{ minHeight: 140 }} />
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 14 }}>
          <span className="caps">photos · {imgs.length}</span>
          <input ref={pick} type="file" accept="image/*" multiple hidden onChange={e => { const f = [...(e.target.files ?? [])]; e.target.value = ''; if (f.length) void attach(f); }} />
          <button className="chip press" style={{ height: 34 }} onClick={() => pick.current?.click()}>{busy ? 'Adding…' : '+ Add photos'}</button>
        </div>
        {imgs.map(r => <Row key={r.id} r={r} onCap={c => setImgs(v => v.map(x => (x.id === r.id ? { ...x, cap: c } : x)))} onRemove={() => { setImgs(v => v.filter(x => x.id !== r.id)); if (added([r]).length) void dropImages([r.id]); }} />)}
      </div>
      <ActionBar onCancel={cancel} primary="Save" onPrimary={save} disabled={!ok} />
    </Sheet>
  );
};
