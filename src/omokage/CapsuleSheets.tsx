import { useState } from 'react';
import { ActionBar } from './Actions';
import { INBOX, ROOT, descendants, isCapsule, nameOf, ordered, parentOf } from './capsules';
import { imgsOf, type Item } from './items';
import { LinkCard } from './link';
import { Prose } from './Prose';
import { Sheet } from './Sheet';
import { CRIMSON, INK, INK2, ago } from './skins';
import { KINDS, Pic, SIZES, SIZE_NAME, SIZE_ORDER, TileBody, classify, sizeOf, type Env, type Size } from './tiles';

/** A little drawing of a snap size, so the picker reads at a glance. */
const Shape = ({ s, on }: { s: Size; on: boolean }) => {
  const [c, r] = SIZES[s], u = 6;
  return <svg width={4 * u + 3} height={4 * u + 3} viewBox={`0 0 ${4 * u + 3} ${4 * u + 3}`} aria-hidden="true">
    <rect x=".5" y=".5" width={4 * u + 2} height={4 * u + 2} rx="3" fill="none" stroke={on ? 'rgba(255,255,255,.4)' : 'rgba(43,50,71,.18)'} />
    <rect x="1.5" y="1.5" width={c * u} height={r * u} rx="2" fill={on ? '#fff' : 'rgba(43,50,71,.35)'} />
  </svg>;
};

/** An artifact, opened: shown in full, with what you can do to it. */
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
      <div className="caps" style={{ textAlign: 'center', padding: '12px 0 0' }}>{KINDS[a.kind].label} · {ago(item.day)}</div>
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
      <div className="caps" style={{ textAlign: 'center', padding: '12px 0 0' }}>Move {ids.length === 1 ? 'this' : `${ids.length} things`} to</div>
      <div className="scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 22px' }}>
        <Row id={ROOT} depth={0} />
        <Row id={INBOX} depth={1} />
        {rows.map(r => <Row key={r.id} id={r.id} depth={r.depth} />)}
        {!rows.length && <div className="it" style={{ fontSize: 14, color: INK2, padding: '16px 4px' }}>No capsules yet. Select things and choose “New capsule” to make one.</div>}
      </div>
      <ActionBar cancel="Cancel" onCancel={onClose} />
    </Sheet>
  );
};
export { imgsOf };
