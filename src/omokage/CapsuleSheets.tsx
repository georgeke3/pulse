import { useRef, useState, type ReactNode } from 'react';
import { ActionBar } from './Actions';
import { INBOX, ROOT, descendants, isCapsule, nameOf, ordered, parentOf } from './capsules';
import { imgsOf, type Item } from './items';
import { LinkCard } from './link';
import { copyClip } from './images';
import { Prose } from './Prose';
import { Sheet } from './Sheet';
import { CRIMSON, INK, INK2, ago } from './skins';
import { KINDS, Pic, SIZES, SIZE_NAME, SIZE_ORDER, TileBody, classify, sizeOf, tintVars, useArtTint, type Env, type Size } from './tiles';

/** A little drawing of a snap size, so the picker reads at a glance. */
const Shape = ({ s, on }: { s: Size; on: boolean }) => {
  const [c, r] = SIZES[s], u = 6;
  return <svg width={4 * u + 3} height={4 * u + 3} viewBox={`0 0 ${4 * u + 3} ${4 * u + 3}`} aria-hidden="true">
    <rect x=".5" y=".5" width={4 * u + 2} height={4 * u + 2} rx="3" fill="none" stroke={on ? 'rgba(255,255,255,.4)' : 'rgba(43,50,71,.18)'} />
    <rect x="1.5" y="1.5" width={c * u} height={r * u} rx="2" fill={on ? '#fff' : 'rgba(43,50,71,.35)'} />
  </svg>;
};

/** Options for an artifact: its size, where it lives, edit, delete. */
export const ArtifactSheet = ({ item, env, onClose, onOpenPhoto, onEdit, onMove, onTrash, onSize, onFlag }: {
  item: Item; env: Env; onClose: () => void; onOpenPhoto: (k: number) => void; onEdit: () => void; onMove: () => void; onTrash: () => void;
  onSize: (s: Size | null) => void; onFlag: () => void;
}) => {
  const a = classify(item), size = sizeOf(a, env), picked = typeof item.meta?.size === 'string';
  const [sure, setSure] = useState(false);
  const [flagged, setFlagged] = useState(!!item.meta?.flag);
  const [c, r] = SIZES[size];
  return (
    <Sheet mode="future">
      <div className="caps" style={{ textAlign: 'center', padding: '12px 0 0' }}>Artifact options · {KINDS[a.kind].label}</div>
      <div className="scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 22px 12px' }}>
        {/* the tile as it sits in the capsule, at its real size */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gridAutoRows: 'calc((min(100vw, 430px) - 44px - 24px) / 4)', gap: 8 }}>
          <div className="ctile" style={{ gridColumn: `span ${c}`, gridRow: `span ${r}` }}><TileBody a={a} size={size} /></div>
        </div>

        <div className="caps" style={{ margin: '16px 0 8px' }}>Size</div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {SIZE_ORDER.map(s => <button key={s} className={`chip press ${s === size ? 'on' : ''}`} onClick={() => onSize(s)} style={{ height: 40, gap: 6, padding: '0 10px 0 7px' }}><Shape s={s} on={s === size} /><span style={{ fontSize: 12 }}>{SIZE_NAME[s]}</span></button>)}
          {picked && <button className="chip press" onClick={() => onSize(null)} style={{ height: 40, fontSize: 12 }}>auto</button>}
        </div>

        {(a.link || a.text || a.imgs.length > 0) && <div className="caps" style={{ margin: '18px 0 8px' }}>In full</div>}
        {a.link && <div className="pinned" style={{ padding: 14 }}><LinkCard link={a.link} note={a.text} open /></div>}
        {!a.link && a.imgs.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: a.imgs.length > 1 ? '1fr 1fr' : '1fr', gap: 6 }}>
            {a.imgs.map((im, k) => <button key={im.id} className="press" onClick={() => onOpenPhoto(k)} style={{ aspectRatio: a.imgs.length > 1 ? '1' : String(Math.max(.6, Math.min(1.8, im.w / im.h || 1))), borderRadius: 10, overflow: 'hidden', position: 'relative' }}><Pic r={im} style={{ position: 'absolute', inset: 0 }} /></button>)}
          </div>
        )}
        {!a.link && a.text && <div style={{ marginTop: a.imgs.length ? 12 : 0, display: 'flex', flexDirection: 'column', maxHeight: 320 }}><Prose text={a.text} copy /></div>}

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
          {a.url && <a className="chip press" href={a.url} target="_blank" rel="noreferrer" style={{ height: 38, textDecoration: 'none' }}>Open ↗</a>}
          <button className="chip press" style={{ height: 38 }} onClick={onEdit}>Edit</button>
          <button className="chip press" style={{ height: 38 }} onClick={onMove}>Move to…</button>
          <button className="chip press" style={{ height: 38, color: sure ? '#fff' : CRIMSON, background: sure ? CRIMSON : undefined }} onClick={() => (sure ? onTrash() : setSure(true))}>{sure ? 'Move to trash?' : 'Delete'}</button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, paddingTop: 12, borderTop: '1px dashed rgba(43,50,71,.16)' }}>
          <span style={{ flex: 1, fontSize: 11, color: INK2 }}>Looks off? Flag it and tell Claude: “{a.kind} · {SIZE_NAME[size]}”.</span>
          <button className="chip press" style={{ height: 32, fontSize: 12 }} onClick={() => { onFlag(); setFlagged(f => !f); }}>{flagged ? 'Flagged ✓' : 'Flag this look'}</button>
        </div>
      </div>
      <ActionBar cancel="Close" onCancel={onClose} />
    </Sheet>
  );
};

/** Pick where things go: the whole capsule tree, minus what's being moved (a capsule can't go inside itself). */
export const MoveSheet = ({ ids, items, onPick, onClose }: { ids: string[]; items: Item[]; onPick: (to: string) => void; onClose: () => void }) => {
  const byId = new Map(items.map(i => [i.id, i]));
  const banned = new Set<string>(); for (const id of ids) if (byId.get(id) && isCapsule(byId.get(id)!)) descendants(id, items).forEach(x => banned.add(x));
  const here = new Set(ids.map(id => (byId.get(id) ? parentOf(byId.get(id)!) : '')));
  const caps = items.filter(i => i.kind === 'future' && isCapsule(i));
  const rows: { id: string; depth: number }[] = [];
  const walk = (parent: string, depth: number) => { for (const c of ordered(caps.filter(c => parentOf(c) === parent))) { if (banned.has(c.id)) continue; rows.push({ id: c.id, depth }); walk(c.id, depth + 1); } };
  walk(ROOT, 1);
  const Row = ({ id, depth }: { id: string; depth: number }) => {
    const cur = here.size === 1 && here.has(id);
    return <button className="press irow" disabled={cur} onClick={() => onPick(id)} style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: `11px 4px 11px ${4 + depth * 18}px`, opacity: cur ? .4 : 1, borderBottom: '1px solid rgba(43,50,71,.07)' }}>
      <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 2, background: id === ROOT ? INK : id === INBOX ? '#8A8FA3' : CRIMSON, opacity: .8, flex: 'none' }} />
      <span className={depth ? 'serif' : 'it'} style={{ fontSize: 16, color: INK, flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{nameOf(id, byId)}</span>
      {cur && <span className="caps" style={{ fontSize: 9 }}>here now</span>}
    </button>;
  };
  return (
    <Sheet mode="future">
      <div className="caps" style={{ textAlign: 'center', padding: '12px 0 0' }}>Move {ids.length === 1 ? 'this artifact' : `${ids.length} artifacts`} to</div>
      <div className="scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 22px' }}>
        <Row id={ROOT} depth={0} />
        <Row id={INBOX} depth={1} />
        {rows.map(r => <Row key={r.id} id={r.id} depth={r.depth} />)}
        {!rows.length && <div className="it" style={{ fontSize: 14, color: INK2, padding: '16px 4px' }}>No capsules yet. Select artifacts and choose “New capsule” to make one.</div>}
      </div>
      <ActionBar cancel="Cancel" onCancel={onClose} />
    </Sheet>
  );
};
export { imgsOf };


/** What copying an artifact puts on the clipboard: its photos, and its words and link as text. Capsules are skipped. */
export const clipOf = (items: Item[]): { ids: string[]; text: string; n: number } => {
  const ids: string[] = [], texts: string[] = []; let n = 0;
  for (const it of items) {
    if (isCapsule(it)) continue;
    const a = classify(it); n++;
    a.imgs.forEach(im => ids.push(im.id));
    const t = [a.link?.kind === 'tweet' ? a.link.text : '', a.text, a.url].filter((x, k, all) => x && all.indexOf(x) === k).join('\n').trim();
    if (t) texts.push(t);
  }
  return { ids, text: texts.join('\n\n'), n };
};
export const copyArtifacts = async (items: Item[]): Promise<string> => {
  const c = clipOf(items);
  if (!c.n || (!c.ids.length && !c.text)) return 'Nothing to copy';
  const r = await copyClip(c.ids, c.text);
  return r === 'shared' ? 'Shared' : `Copied ${c.n === 1 ? 'artifact' : `${c.n} artifacts`}`;
};

/** An artifact, opened as a full page: everything in it at full size, washed in its own colour. Photos zoom, text selects,
 *  Copy puts it on the clipboard, and a sideways swipe goes to the next or previous artifact in the capsule. */
export const ArtifactPage = ({ item, onClose, onOpenPhoto, onOptions, pos, onGo, extra, toast }: {
  item: Item; onClose: () => void; onOpenPhoto: (k: number) => void; onOptions: () => void;
  pos?: { n: number; of: number }; onGo?: (step: 1 | -1) => void; extra?: ReactNode; toast?: string;
}) => {
  const a = classify(item), [note, setNote] = useState('');
  const tint = useArtTint(item);
  const tweetPics = a.link?.kind === 'tweet' ? (a.link.photos ?? []) : [];
  const copy = () => { setNote('Copying…'); copyArtifacts([item]).then(setNote, () => setNote('Couldn’t copy')).finally(() => setTimeout(() => setNote(''), 1800)); };
  const ratio = (w: number, h: number) => String(Math.max(.5, Math.min(2, w / h || 1)));
  // sideways swipe: only when clearly horizontal, so scrolling and text selection stay untouched
  const sw = useRef<{ x: number; y: number; t: number } | null>(null), [dx, setDxS] = useState(0), dxR = useRef(0);
  const setDx = (v: number) => { dxR.current = v; setDxS(v); };
  const touch = {
    onTouchStart: (e: React.TouchEvent) => { if (e.touches.length === 1 && onGo) sw.current = { x: e.touches[0].clientX, y: e.touches[0].clientY, t: Date.now() }; },
    onTouchMove: (e: React.TouchEvent) => { const s0 = sw.current; if (!s0) return; const x = e.touches[0].clientX - s0.x, y = e.touches[0].clientY - s0.y; if (Math.abs(y) > 24 && Math.abs(y) > Math.abs(x)) { sw.current = null; setDx(0); return; } if (Math.abs(x) > 12) setDx(x * .5); },
    onTouchEnd: () => { const s0 = sw.current, d = dxR.current; sw.current = null; setDx(0); if (s0 && onGo && Math.abs(d) > 40) onGo(d < 0 ? 1 : -1); },
    onTouchCancel: () => { sw.current = null; setDx(0); },
  };
  return (
    <Sheet mode="future" still>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, ...tintVars(tint), background: tint ? 'radial-gradient(120% 70% at 50% 0%, rgba(var(--tint),.30), rgba(var(--tint),.08) 60%, transparent)' : undefined, transition: 'background .5s', pointerEvents: 'none' }} />
      <div className="caps" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '12px 0 0' }}>
        {pos && onGo && <button className="press" aria-label="Previous artifact" disabled={pos.n <= 1} onClick={() => onGo(-1)} style={{ fontSize: 16, padding: '0 8px', opacity: pos.n <= 1 ? .25 : .7 }}>‹</button>}
        <span>{KINDS[a.kind].label} · {ago(item.day)}{pos ? ` · ${pos.n} of ${pos.of}` : ''}</span>
        {pos && onGo && <button className="press" aria-label="Next artifact" disabled={pos.n >= pos.of} onClick={() => onGo(1)} style={{ fontSize: 16, padding: '0 8px', opacity: pos.n >= pos.of ? .25 : .7 }}>›</button>}
      </div>
      <div key={`body-${item.id}`} className="scroll" {...touch} style={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 18px 16px', userSelect: 'text', WebkitUserSelect: 'text', touchAction: 'pan-y pinch-zoom', transform: dx ? `translateX(${dx}px)` : undefined, transition: dx ? 'none' : 'transform .25s', animation: 'enter .3s both' }}>
        {a.link && <div className="pinned" style={{ padding: 14 }}><LinkCard link={a.link} note={a.text} open /></div>}
        {tweetPics.length > 0 && <div style={{ display: 'grid', gap: 8, marginTop: 10 }}>{tweetPics.map((p, k) => <img key={k} src={p.url} alt="" style={{ width: '100%', borderRadius: 10, display: 'block' }} />)}</div>}
        {a.imgs.length > 0 && (
          <div style={{ display: 'grid', gap: 8 }}>
            {a.imgs.map((im, k) => <button key={im.id} className="press" aria-label="Zoom photo" onClick={() => onOpenPhoto(k)} style={{ aspectRatio: ratio(im.w, im.h), width: '100%', borderRadius: 12, overflow: 'hidden', position: 'relative', display: 'block', boxShadow: '0 10px 30px rgba(43,50,71,.14)' }}><Pic r={im} full style={{ position: 'absolute', inset: 0 }} /></button>)}
            <div className="caps" style={{ textAlign: 'center', fontSize: 9.5, opacity: .6 }}>Tap a photo to zoom</div>
          </div>
        )}
        {!a.link && a.text && <div style={{ marginTop: a.imgs.length ? 14 : 0, display: 'flex', flexDirection: 'column' }}><Prose text={a.text} /></div>}
        {!a.link && !a.text && !a.imgs.length && <div className="it" style={{ color: INK2, fontSize: 14, textAlign: 'center', padding: 24 }}>Empty artifact.</div>}
      </div>
      {toast && <div role="status" className="it" style={{ position: 'relative', textAlign: 'center', fontSize: 13, color: INK2, padding: '2px 0 4px' }}>{toast}</div>}
      {extra}
      <ActionBar cancel="Close" onCancel={onClose}>
        <button className="chip press" onClick={copy} style={{ height: 54, flex: '0 0 30%', fontSize: 15 }}>{note || 'Copy'}</button>
        <button className="chip on press" onClick={onOptions} style={{ height: 54, flex: 1, fontSize: 16 }}>Options</button>
      </ActionBar>
    </Sheet>
  );
};

/** Filing an Inbox artifact in one tap: the capsules you used last come first; "New" names one on the spot. */
export const FileRow = ({ caps, onFile, onNew, onTrash }: { caps: { id: string; name: string }[]; onFile: (id: string) => void; onNew: (name: string) => void; onTrash: () => void }) => {
  const [naming, setNaming] = useState(false), [sure, setSure] = useState(false);
  return (
    <div style={{ position: 'relative', flex: 'none', padding: '6px 0 10px' }}>
      <div className="caps" style={{ padding: '0 20px 6px', fontSize: 9.5 }}>File into</div>
      {naming
        ? <form onSubmit={e => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get('n') || '').trim(); if (v) onNew(v); setNaming(false); }} style={{ display: 'flex', gap: 8, padding: '0 20px' }}>
            <input name="n" autoFocus placeholder="New capsule name" aria-label="New capsule name" style={{ flex: 1, minWidth: 0, height: 40, borderRadius: 20, border: '1px solid rgba(43,50,71,.2)', padding: '0 14px', background: '#fff', fontFamily: 'var(--serif)', fontSize: 15, outline: 'none' }} />
            <button className="chip on press" type="submit" style={{ height: 40 }}>Create</button>
            <button className="chip press" type="button" onClick={() => setNaming(false)} style={{ height: 40 }}>✕</button>
          </form>
        : <div className="scroll" style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 20px', scrollbarWidth: 'none' }}>
            <button className="chip press" onClick={() => setNaming(true)} style={{ height: 40, flex: 'none', borderStyle: 'dashed' }}>+ New</button>
            {caps.map(c => <button key={c.id} className="chip press" onClick={() => onFile(c.id)} style={{ height: 40, flex: 'none', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</button>)}
            <button className="chip press" onClick={() => (sure ? onTrash() : setSure(true))} style={{ height: 40, flex: 'none', color: sure ? '#fff' : CRIMSON, background: sure ? CRIMSON : undefined }}>{sure ? 'Sure?' : 'Delete'}</button>
          </div>}
    </div>
  );
};
