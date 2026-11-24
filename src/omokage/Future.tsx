import { navLabels, useNavState } from './nav';
import { Drg, Sym, DrgFit } from './Sym';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Belt, Fly } from './Art';
import { addImage, copyImages, dropImages, useImg, type ImgRef } from './images';
import { imgsOf, useItems, type Item } from './items';
import { CRIMSON, INK, INK2, SKY, ago, todayStr } from './skins';
import { Typing } from './Typing';
import { Viewer, type Shot } from './Viewer';
import { PinEdit } from './PinEdit';
import { useUnfurl } from './link';
import { INBOX, ROOT, TRASH as TRASH_ID, descendants, isCapsule, nameOf, ordered, parentOf, pathTo, sortKey, useCapsuleMigration } from './capsules';
import { SIZES, TileBody, classify, gistOf, sizeOf, type Env, type Size } from './tiles';
import { ArtifactSheet, MoveSheet } from './CapsuleSheets';
import { haptic } from './haptics';

export const TRASH = TRASH_ID;
const KEEP_DAYS = 30;
const FADE = 'linear-gradient(to bottom, transparent 0, #000 16px, #000 calc(100% - 28px), transparent 100%)';

const HK = 'omokage_resurface_seen';
const URL_RE = /(https?:\/\/[^\s]+)/i;

const Decor = () => (
  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 393 740" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <Belt d="M-30 660 C 90 600, 200 640, 290 550 S 400 370, 450 340" c={CRIMSON} w={4} o={.3} stitch={false} />
    <path d="M352 362 L400 346 L384 374 L402 394Z" fill={CRIMSON} opacity=".75" />
    <Fly x={318} y={540} s={.8} c={SKY} o={.9} st="glow" /><Fly x={352} y={512} s={.6} c={SKY} o={.8} st="glow" d={1} />
    <Fly x={290} y={518} s={.45} c={SKY} o={.7} st="glow" d={2} /><Fly x={372} y={552} s={.4} c={SKY} o={.6} st="glow" d={.6} />
  </svg>
);
const Capture = ({ label, onTap, onPhotos }: { label: string; onTap: () => void; onPhotos: (f: File[]) => void }) => (
  <div className="pill-input" style={{ position: 'relative', flex: 'none', width: '100%', gap: 6 }}>
    <button className="press it" onClick={onTap} style={{ fontSize: 15.5, color: INK2, flex: 1, textAlign: 'left', height: '100%' }}>{label}</button>
    <label className="press" aria-label="Add photos" style={{ width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', boxShadow: 'inset 0 0 0 1px rgba(43,50,71,.2)', cursor: 'pointer' }}>
      <input type="file" accept="image/*" multiple hidden onChange={e => { const f = [...(e.target.files ?? [])]; e.target.value = ''; if (f.length) onPhotos(f); }} />
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke={INK} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2.5" y="3.5" width="15" height="13" rx="2.5" /><circle cx="7.2" cy="8" r="1.4" /><path d="M3 14.5l4.2-4 3.2 3 2.4-2.2 4.2 4" /></svg>
    </label>
    <button className="press" aria-label="Write" onClick={onTap} style={{ width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', background: CRIMSON, color: '#fff', fontSize: 22, fontWeight: 300 }}>+</button>
  </div>
);

const Tile = ({ r, label, onClick, cover = true, ratio }: { r: ImgRef; label?: string; onClick: () => void; cover?: boolean; ratio?: number }) => {
  const u = useImg(r.id, 'thumb');
  return (
    <button onClick={e => { e.stopPropagation(); onClick(); }} aria-label="Open photo" style={{ aspectRatio: ratio ? String(ratio) : cover ? '1' : undefined, position: 'relative' }}>
      {u && <img src={u} alt="" draggable={false} />}
      {label && <span className="more">{label}</span>}
    </button>
  );
};
const Mini = ({ id, s }: { id: string; s: number }) => { const u = useImg(id, 'thumb'); return <span style={{ width: s, height: s, borderRadius: 6, overflow: 'hidden', background: 'rgba(43,50,71,.08)', flex: 'none' }}>{u && <img src={u} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />}</span>; };

/** Photos on a pinned card: one photo keeps its shape; several tile up to four, with +N on the last. */
const Pics = ({ item, onOpen }: { item: Item; onOpen: (k: number) => void }) => {
  const im = imgsOf(item); if (!im.length) return null;
  const show = im.slice(0, 4), extra = im.length - show.length;
  const ratio = im.length === 1 ? Math.max(.75, Math.min(1.5, im[0].w / im[0].h)) : undefined;
  return (
    <div className="pic" style={{ gridTemplateColumns: im.length === 1 ? '1fr' : '1fr 1fr' }}>
      {show.map((r, k) => <Tile key={r.id} r={r} ratio={ratio} onClick={() => onOpen(k)} label={extra > 0 && k === show.length - 1 ? `+${extra + 1}` : undefined} />)}
      {im.length === 1 && im[0].cap && <div className="it" style={{ fontSize: 12, color: INK2, padding: '4px 4px 0' }}>{im[0].cap}</div>}
    </div>
  );
};
const shotsOf = (list: Item[]): Shot[] => list.flatMap(i => imgsOf(i).map(r => ({ ref: r, text: r.cap || i.body.replace(URL_RE, '').trim(), day: i.day })));
const Grid = ({ shots, onOpen }: { shots: Shot[]; onOpen: (k: number) => void }) => {
  const [sel, setSel] = useState<Set<string> | null>(null);
  const [note, setNote] = useState('');
  const flip = (id: string) => setSel(v => { const n = new Set(v); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const copy = () => {
    const ids = shots.filter(s => sel?.has(s.ref.id)).map(s => s.ref.id);
    if (!ids.length) return;
    setNote('Copying…');
    copyImages(ids).then(r => { setNote(r === 'copied' ? `Copied ${ids.length}` : 'Shared'); setSel(null); }, () => setNote('Couldn’t copy')).finally(() => setTimeout(() => setNote(''), 2200));
  };
  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 18, padding: '2px 24px 8px', margin: '0 -24px' }}>
        {note && <span className="caps" style={{ marginRight: 'auto' }}>{note}</span>}
        {sel ? <>
          <button className="press caps" onClick={() => setSel(sel.size === shots.length ? new Set() : new Set(shots.map(s => s.ref.id)))}>{sel.size === shots.length ? 'none' : 'all'}</button>
          <button className="press caps" onClick={copy} disabled={!sel.size} style={{ opacity: sel.size ? 1 : .4 }}>Copy {sel.size || ''}</button>
          <button className="press caps" onClick={() => setSel(null)}>done</button>
        </> : <button className="press caps" onClick={() => setSel(new Set())}>select</button>}
      </div>
      <div className="pg">{shots.map((s, k) => (
        <span key={s.ref.id} style={{ position: 'relative', display: 'block' }}>
          <Tile r={s.ref} onClick={() => (sel ? flip(s.ref.id) : onOpen(k))} />
          {sel && <span style={{ position: 'absolute', right: 6, top: 6, width: 22, height: 22, borderRadius: 11, display: 'grid', placeItems: 'center', fontSize: 13, pointerEvents: 'none', background: sel.has(s.ref.id) ? '#2B3247' : 'rgba(255,255,255,.7)', color: '#fff', boxShadow: 'inset 0 0 0 1.5px #fff' }}>{sel.has(s.ref.id) ? '✓' : ''}</span>}
        </span>
      ))}</div>
    </>
  );
};


const GAP = 8;
/** Long-press (still finger, ~0.4s) vs tap, on tiles that also scroll with the page. */
const usePress = (onTap: (id: string) => void, onLong: (id: string) => void) => {
  const p = useRef<{ t: number; x: number; y: number; fired: boolean } | null>(null);
  return (id: string) => ({
    onPointerDown: (e: React.PointerEvent) => { const t = window.setTimeout(() => { if (p.current) { p.current.fired = true; haptic(12); onLong(id); } }, 420); p.current = { t, x: e.clientX, y: e.clientY, fired: false }; },
    onPointerMove: (e: React.PointerEvent) => { const c = p.current; if (c && Math.hypot(e.clientX - c.x, e.clientY - c.y) > 9) { clearTimeout(c.t); p.current = null; } },
    onPointerUp: () => { const c = p.current; if (!c) return; clearTimeout(c.t); p.current = null; if (!c.fired) onTap(id); },
    onPointerCancel: () => { if (p.current) clearTimeout(p.current.t); p.current = null; },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  });
};

/** The capsule grid: four square columns; each tile spans its snap size and the grid packs densely, so there are never holes. */
const CapsuleGrid = ({ list, env, sel, onTap, onLong, lead, tail }: { list: Item[]; env: Env; sel: Set<string> | null; onTap: (id: string) => void; onLong: (id: string) => void; lead?: React.ReactNode; tail?: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null), [cell, setCell] = useState(80);
  useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const fit = () => setCell(Math.max(40, (el.clientWidth - 3 * GAP) / 4));
    fit(); const ro = new ResizeObserver(fit); ro.observe(el); return () => ro.disconnect();
  }, []);
  const press = usePress(onTap, onLong);
  return (
    <div ref={ref} className={sel ? 'cgrid selecting' : 'cgrid'} style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gridAutoRows: cell, gap: GAP, gridAutoFlow: 'row dense' }}>
      {lead}
      {list.map((i, k) => {
        const a = classify(i), s: Size = sizeOf(a, env), [c, r] = SIZES[s], on = !!sel?.has(i.id);
        return (
          <div key={i.id} data-pin={i.id} data-kind={a.kind} data-size={s} className={`ctile${on ? ' sel' : ''}`} role="button" aria-label={`${gistOf(i)}`} aria-pressed={sel ? on : undefined}
            style={{ gridColumn: `span ${c}`, gridRow: `span ${r}`, animation: `enter .4s ${Math.min(k, 10) * 30}ms both` }} {...press(i.id)}>
            <TileBody a={a} size={s} />
            {sel && <span className="ccheck" aria-hidden="true">{on ? '✓' : ''}</span>}
          </div>
        );
      })}
      {tail}
    </div>
  );
};

export const Future = () => {
  const { items, add, put, remove, update } = useItems();
  const [board, setBoard] = useNavState<string | null>('future.board', null);
  const here = board ?? ROOT;
  const [typing, setTyping] = useNavState('future.compose', false);
  const [focusId] = useNavState<string | null>('future.focus', null);
  useEffect(() => { if (!focusId) return; const t = setTimeout(() => document.querySelector(`[data-pin="${focusId}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350); return () => clearTimeout(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [seen, setSeen] = useState(() => localStorage.getItem(HK));
  const [view, setView] = useNavState<{ shots: Shot[]; start: number } | null>('future.view', null);
  const [allPhotos, setAllPhotos] = useNavState('future.allPhotos', false);
  const [editing, setEditing] = useNavState<Item | null>('future.editing', null);
  const [sheetId, setSheetId] = useNavState<string | null>('future.sheet', null);
  const [moving, setMoving] = useNavState<string[] | null>('future.move', null);
  const [pre, setPre] = useState<ImgRef[]>([]);
  const [sel, setSel] = useState<Set<string> | null>(null);
  const [naming, setNaming] = useState<null | 'new' | 'from-sel' | 'rename'>(null);
  const [sure, setSure] = useState<string | null>(null);
  const [toast, setToast] = useState('');
  useEffect(() => { setSel(null); setNaming(null); setSure(null); }, [here]);
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(''), 2600); return () => clearTimeout(t); }, [toast]);

  useCapsuleMigration(items, put, update);
  const all = useMemo(() => items.filter(i => i.kind === 'future'), [items]);
  const byId = useMemo(() => new Map(all.map(i => [i.id, i])), [all]);
  const trash = all.filter(i => i.board === TRASH).sort((a, b) => String(b.meta?.trashedAt ?? '').localeCompare(String(a.meta?.trashedAt ?? '')));
  // things inside a trashed capsule go with it (they come back when it's restored)
  const hidden = useMemo(() => { const h = new Set<string>(); for (const c of all) if (c.board === TRASH && isCapsule(c)) descendants(c.id, all).forEach(x => x !== c.id && h.add(x)); return h; }, [all]);
  const mine = all.filter(i => i.board !== TRASH && !hidden.has(i.id));
  for (const c of mine) if (isCapsule(c)) navLabels.set(c.id, c.title || 'Untitled');
  navLabels.set(INBOX, 'Inbox');
  useUnfurl(mine, (id, meta) => update(id, { meta }));
  const kids = (id: string) => mine.filter(i => parentOf(i) === id);
  const exists = here === ROOT || here === INBOX || here === TRASH || (byId.has(here) && !hidden.has(here) && byId.get(here)!.board !== TRASH);
  useEffect(() => { if (!exists) setBoard(null, 'replace'); }, [exists]); // eslint-disable-line react-hooks/exhaustive-deps

  const takePhotos = async (files: File[]) => { const got: ImgRef[] = []; for (const f of files) { try { got.push(await addImage(f)); } catch { /* skip unreadable */ } } if (got.length) { setPre(got); setTyping(true); } };
  const openPic = (list: Item[], item: Item, k: number) => { let start = k; for (const x of list) { if (x.id === item.id) break; start += imgsOf(x).length; } setView({ shots: shotsOf(list), start }); };

  // deleting moves to the trash (restorable for 30 days); a capsule takes its contents with it
  const toTrash = (i: Item) => update(i.id, { board: TRASH, meta: { ...(i.meta ?? {}), trashedFrom: parentOf(i), trashedAt: new Date().toISOString() } });
  const restore = (i: Item) => {
    const { trashedFrom, trashedAt: _t, ...rest } = (i.meta ?? {}) as Record<string, unknown>;
    const to = String(trashedFrom || INBOX), ok = to === ROOT || to === INBOX || (byId.has(to) && byId.get(to)!.board !== TRASH);
    update(i.id, { board: ok ? to : INBOX, meta: rest });
  };
  const removeDeep = (i: Item) => { if (isCapsule(i)) descendants(i.id, all).forEach(id => remove(id)); else remove(i.id); };
  useEffect(() => { for (const i of trash) if (Date.now() - new Date(String(i.meta?.trashedAt ?? i.at)).getTime() > KEEP_DAYS * 864e5) removeDeep(i); }, [trash.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Move things into a capsule; they arrive at the top, keeping their order. */
  const moveTo = (ids: string[], to: string) => {
    const top = Math.min(0, ...kids(to).map(sortKey)), list = ordered(ids.map(id => byId.get(id)!).filter(Boolean));
    list.forEach((i, k) => update(i.id, { board: to, meta: { ...(i.meta ?? {}), ord: top - list.length + k } }));
  };
  const makeCapsule = (name: string, ids: string[] = []) => {
    const parent = here === INBOX || here === TRASH ? ROOT : here;
    const first = ids.map(id => byId.get(id)).filter((x): x is Item => !!x && parentOf(x) === parent);
    const ord = first.length ? Math.min(...first.map(sortKey)) - .5 : Math.min(0, ...kids(parent).map(sortKey)) - 1;
    const id = add({ kind: 'future', body: '', title: name, board: parent, meta: { capsule: true, ord } });
    if (ids.length) ids.forEach(x => { const i = byId.get(x); if (i) update(x, { board: id }); });
    navLabels.set(id, name);
    return { id, parent };
  };
  const setSize = (i: Item, s: Size | null) => { const { size: _s, ...m } = (i.meta ?? {}) as Record<string, unknown>; update(i.id, { meta: s ? { ...m, size: s } : m }); };
  const flag = (i: Item) => { const { flag: f, ...m } = (i.meta ?? {}) as Record<string, unknown>; const a = classify(i); update(i.id, { meta: f ? m : { ...m, flag: { at: new Date().toISOString(), kind: a.kind, size: sizeOf(a, { kids }) } } }); };

  const target = here === ROOT || here === TRASH ? INBOX : here, targetName = nameOf(target, byId);
  const sheet = typing && (
    <Typing mode="future" photos initialImages={pre} label={`future · ${targetName.toLowerCase()}`} prompt={target === INBOX ? 'An idea, a link, a question. It waits in the inbox.' : `Into ${targetName}: an idea, a link, a question.`} placeholder="What if…"
      onCancel={() => { void dropImages(pre.map(x => x.id)); setPre([]); setTyping(false); }}
      onSave={(t, _tags, imgs) => { add({ kind: 'future', body: t, board: target, meta: imgs.length ? { images: imgs } : undefined }); setPre([]); setTyping(false); }} />
  );
  const open = sheetId ? byId.get(sheetId) : undefined;
  const overlays = <>
    {view && <Viewer shots={view.shots} start={view.start} onClose={() => setView(null)} />}
    {open && !editing && !moving && <ArtifactSheet item={open} onClose={() => setSheetId(null)}
      onOpenPhoto={k => openPic([open], open, k)} onEdit={() => setEditing(open)} onMove={() => setMoving([open.id])}
      onTrash={() => { toTrash(open); setSheetId(null); }} env={{ kids }} onSize={s => setSize(open, s)} onFlag={() => flag(open)} />}
    {moving && <MoveSheet ids={moving} items={mine} onClose={() => setMoving(null)} onPick={to => { moveTo(moving, to); setToast(`Moved to ${nameOf(to, byId)}`); setMoving(null); setSel(null); if (sheetId) setSheetId(null); }} />}
    {editing && <PinEdit item={editing} onClose={() => setEditing(null)} onSave={(body, imgs) => { const { images: _i, ...meta } = (editing.meta ?? {}) as Record<string, unknown>; update(editing.id, { body, meta: imgs.length ? { ...meta, images: imgs } : meta }); setEditing(null); }} />}
  </>;
  const photoItems = mine.filter(i => imgsOf(i).length);

  if (allPhotos) {
    const shots = shotsOf(photoItems);
    return (
      <div className="screen" style={{ paddingBottom: 12, touchAction: 'pan-y' }}>
        <Decor />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 6 }}>
          <span className="it" style={{ fontSize: 20 }}>Photos</span>
          <span className="caps">{shots.length} saved</span>
        </div>
        <div className="scroll grow" style={{ position: 'relative', margin: '6px -24px 0', padding: '0 24px 16px' }}>
          <Grid shots={shots} onOpen={k => setView({ shots, start: k })} />
        </div>
        <Capture label="Save an idea, link or question…" onTap={() => setTyping(true)} onPhotos={takePhotos} />
        {sheet}{overlays}
      </div>
    );
  }

  if (here === TRASH) {
    return (
      <div className="screen" style={{ paddingBottom: 12, touchAction: 'pan-y' }}>
        <Decor />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 6 }}>
          <span className="it" style={{ fontSize: 20 }}>Trash</span>
          <span className="caps">{trash.length}</span>
        </div>
        <div className="it" style={{ position: 'relative', fontSize: 12.5, color: INK2, paddingBottom: 6 }}>Deleted things wait here for {KEEP_DAYS} days.</div>
        <div className="scroll grow" style={{ position: 'relative', margin: '-6px -24px 0', padding: '18px 24px 16px', display: 'flex', flexDirection: 'column', gap: 12, WebkitMaskImage: FADE, maskImage: FADE }}>
          {trash.length === 0 && <div className="it mute" style={{ textAlign: 'center', marginTop: 60, fontSize: 15 }}>Nothing thrown away.<Drg n="tiny" w={90} style={{ margin: '16px auto 0' }} /></div>}
          {trash.map(i => (
            <div key={i.id} className="pinned" style={{ flex: 'none', opacity: .92 }}>
              {isCapsule(i)
                ? <div><span className="serif" style={{ fontSize: 18 }}>{i.title || 'Untitled'}</span><div style={{ fontSize: 11.5, color: INK2, marginTop: 2 }}>capsule · {descendants(i.id, all).size - 1} inside</div></div>
                : <><Pics item={i} onOpen={n => openPic(trash, i, n)} />
                  {i.body && <div style={{ fontSize: 13.5, lineHeight: 1.4, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{gistOf(i)}</div>}</>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <span style={{ fontSize: 10.5, color: INK2, flex: 1 }}>from {nameOf(String(i.meta?.trashedFrom ?? INBOX), byId)} · {ago(String(i.meta?.trashedAt ?? i.at).slice(0, 10))}</span>
                <button className="chip" style={{ height: 30, fontSize: 12 }} onClick={() => restore(i)}>Restore</button>
                <button className="chip" style={{ height: 30, fontSize: 12, color: sure === i.id ? '#fff' : CRIMSON, background: sure === i.id ? CRIMSON : undefined }} onClick={() => (sure === i.id ? (removeDeep(i), setSure(null)) : setSure(i.id))}>{sure === i.id ? 'Delete forever' : 'Delete'}</button>
              </div>
            </div>
          ))}
        </div>
        {trash.length > 1 && <button className="chip press" style={{ position: 'relative', height: 44, color: sure === 'all' ? '#fff' : CRIMSON, background: sure === 'all' ? CRIMSON : '#fff' }} onClick={() => (sure === 'all' ? (trash.forEach(removeDeep), setSure(null)) : setSure('all'))}>{sure === 'all' ? `Tap again to delete ${trash.length} for good` : 'Empty trash'}</button>}
        {overlays}
      </div>
    );
  }

  /* ---------- a capsule (the root, the inbox, or one you made) ---------- */
  const list = here === INBOX ? ordered(kids(INBOX), true) : ordered(kids(here));
  const crumbs = pathTo(here, byId).slice(0, -1), deep = crumbs.length > 1;
  const inbox = kids(INBOX);
  const stale = mine.filter(i => !isCapsule(i) && Date.now() - new Date(i.at).getTime() > 14 * 864e5);
  const resurface = here !== ROOT || seen === todayStr() || !stale.length ? null : stale[new Date().getDate() % stale.length];
  const markSeen = () => { localStorage.setItem(HK, todayStr()); setSeen(todayStr()); };
  const tap = (id: string) => {
    if (sel) { setSel(v => { const n = new Set(v); if (n.has(id)) n.delete(id); else n.add(id); return n; }); return; }
    const i = byId.get(id); if (!i) return;
    if (isCapsule(i)) setBoard(id); else setSheetId(id);
  };
  const long = (id: string) => setSel(v => { const n = new Set(v ?? []); n.add(id); return n; });
  const selIds = sel ? [...sel] : [];

  const inboxTile = here === ROOT && (
    <button className="ctile press" onClick={() => !sel && setBoard(INBOX)} style={{ gridColumn: 'span 4', gridRow: 'span 1', background: INK, color: '#fff', display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', textAlign: 'left', opacity: sel ? .5 : 1 }}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 13h4l1.5 2.5h5L16 13h4" /><path d="M5.5 5.5h13L20 13v5.5H4V13z" /></svg>
      <span style={{ flex: 1, minWidth: 0 }}><span className="serif" style={{ display: 'block', fontSize: 17 }}>Inbox</span><span style={{ fontSize: 11, opacity: .7 }}>{inbox.length ? `${inbox.length} waiting for a home` : 'all sorted'}</span></span>
      <span style={{ display: 'flex', gap: 4 }}>{ordered(inbox, true).filter(i => imgsOf(i).length).slice(0, 3).map(i => <Mini key={i.id} id={imgsOf(i)[0].id} s={40} />)}</span>
      <span style={{ fontSize: 18, opacity: .7 }}>›</span>
    </button>
  );
  const newTile = !sel && here !== INBOX && (naming === 'new'
    ? <form className="ctile" onSubmit={e => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get('n') || '').trim(); if (v) { makeCapsule(v); } setNaming(null); }}
        style={{ gridColumn: 'span 2', gridRow: 'span 1', padding: '0 12px', display: 'flex', alignItems: 'center', background: '#F6EEE0' }}>
        <input name="n" autoFocus placeholder="Name it" aria-label="Capsule name" onBlur={e => { if (!e.currentTarget.value.trim()) setNaming(null); }} style={{ border: 0, background: 'transparent', outline: 'none', fontFamily: 'var(--serif)', fontSize: 16, width: '100%', color: INK }} />
      </form>
    : <button className="press" onClick={() => setNaming('new')} style={{ gridColumn: 'span 2', gridRow: 'span 1', borderRadius: 12, border: '1.2px dashed rgba(43,50,71,.28)', fontSize: 13, color: INK2 }}>+ New capsule</button>);

  return (
    <div className="screen" style={{ paddingBottom: 12, touchAction: 'pan-y' }}>
      <Decor />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-end', gap: 10, paddingBottom: 4, paddingTop: here === ROOT ? 8 : 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {deep && (
            <div className="caps" style={{ display: 'flex', gap: 5, flexWrap: 'nowrap', overflow: 'hidden', fontSize: 9.5 }}>
              {crumbs.map((c, k) => <span key={c} style={{ display: 'flex', gap: 5, minWidth: 0 }}><button className="press caps" style={{ fontSize: 9.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} onClick={() => setBoard(c === ROOT ? null : c)}>{nameOf(c, byId)}</button>{k < crumbs.length - 1 && <span aria-hidden="true">›</span>}</span>)}
            </div>
          )}
          {here === ROOT
            ? <span className="it" style={{ fontSize: 15, color: INK2 }}>{mine.length ? `${kids(ROOT).filter(isCapsule).length} capsules` : 'Somedays, kept close'}</span>
            : naming === 'rename'
              ? <form onSubmit={e => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get('n') || '').trim(); if (v) update(here, { title: v }); setNaming(null); }}>
                  <input name="n" autoFocus defaultValue={nameOf(here, byId)} aria-label="Capsule name" onBlur={e => { const v = e.currentTarget.value.trim(); if (v && v !== nameOf(here, byId)) update(here, { title: v }); setNaming(null); }}
                    style={{ border: 0, borderBottom: '1px dashed rgba(43,50,71,.3)', background: 'transparent', outline: 'none', fontFamily: 'var(--serif)', fontSize: 26, width: '100%', color: INK, padding: 0 }} />
                </form>
              : <button className="serif press" onClick={() => here !== INBOX && setNaming('rename')} style={{ fontSize: 26, lineHeight: 1.15, textAlign: 'left', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{nameOf(here, byId)}</button>}
        </div>
        {here === ROOT && photoItems.length > 0 && !sel && <button className="chip press" style={{ height: 32 }} onClick={() => setAllPhotos(true)}>Photos · {photoItems.reduce((n, i) => n + imgsOf(i).length, 0)}</button>}
        {list.length > 0 && <button className="press caps" style={{ padding: '6px 0' }} onClick={() => setSel(sel ? null : new Set())}>{sel ? 'done' : 'select'}</button>}
      </div>

      <div className="scroll grow" style={{ position: 'relative', margin: '0 -24px -12px', padding: '14px 24px 104px', WebkitMaskImage: FADE, maskImage: FADE }}>
        <CapsuleGrid list={list} env={{ kids }} sel={sel} onTap={tap} onLong={long} lead={inboxTile} tail={newTile} />
        {list.length === 0 && here !== ROOT && <div className="it mute" style={{ textAlign: 'center', marginTop: 40, fontSize: 15 }}>{here === INBOX ? 'The inbox is clear.' : 'An empty capsule. Add the first thing below, or move things in.'}<div style={{ margin: '18px auto 0', width: 120 }}><DrgFit n="future" w={120} h={91} /></div></div>}
        {here === ROOT && trash.length > 0 && <button className="press" onClick={() => setBoard(TRASH)} style={{ display: 'block', margin: '18px auto 0', fontSize: 12.5, color: INK2 }}>Trash · {trash.length}</button>}
        {here !== ROOT && here !== INBOX && !sel && <button className="press" onClick={() => { if (sure !== 'cap') { setSure('cap'); return; } const c = byId.get(here); if (c) { toTrash(c); setBoard(null); } }} style={{ display: 'block', margin: '28px auto 0', fontSize: 12, color: sure === 'cap' ? CRIMSON : INK2 }}>{sure === 'cap' ? `Tap again: move “${nameOf(here, byId)}” and everything in it to the trash` : 'Delete this capsule'}</button>}

        {resurface && (
          <div style={{ position: 'relative', marginTop: 56, animation: 'enter .5s .15s both' }}>
            <Drg n="peek" w={84} style={{ position: 'absolute', right: 0, top: -44 }} />
            <div className="caps">still excited about this?</div>
            {imgsOf(resurface).length > 0 && <div style={{ marginTop: 10 }}><Mini id={imgsOf(resurface)[0].id} s={72} /></div>}
            <div className="it" style={{ fontSize: 23, lineHeight: 1.3, marginTop: 10, maxWidth: 262, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{gistOf(resurface)}</div>
            <div style={{ fontSize: 11.5, color: INK2, marginTop: 8 }}>{nameOf(parentOf(resurface), byId)} · saved {ago(resurface.day)}</div>
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button className="chip on" style={{ height: 38, padding: '0 18px', gap: 8 }} onClick={() => { update(resurface.id, { meta: { ...(resurface.meta ?? {}), kept: todayStr() } }); markSeen(); }}><Sym n="seal" on s={18} /> Yes, keep it</button>
              <button className="chip" style={{ height: 38, padding: '0 18px', ...(sure === 'rs' ? { background: CRIMSON, color: '#fff' } : {}) }} onClick={() => { if (sure !== 'rs') { setSure('rs'); return; } toTrash(resurface); markSeen(); }}>{sure === 'rs' ? 'Tap again to let go' : 'Let it go'}</button>
            </div>
          </div>
        )}
        {here === ROOT && mine.length === 0 && (
          <div style={{ position: 'relative', marginTop: 24 }}>
            <div className="caps">to begin</div>
            <div className="it" style={{ fontSize: 21, lineHeight: 1.35, marginTop: 10, maxWidth: 300, color: INK }}>Save anything that pulls at you: a place, a question, a someday.</div>
            <div style={{ margin: '22px 0 0 auto', width: 120 }}><DrgFit n="future" w={120} h={91} o={.9} /></div>
          </div>
        )}
      </div>

      <div style={{ position: 'absolute', left: 24, right: 24, bottom: 12, zIndex: 2 }}>
        {toast && <div role="status" className="it" style={{ textAlign: 'center', fontSize: 13, color: INK2, marginBottom: 8 }}>{toast}</div>}
        {sel ? (
          naming === 'from-sel'
            ? <form className="selbar" onSubmit={e => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get('n') || '').trim(); if (!v) return; const { id, parent } = makeCapsule(v, selIds); setSel(null); setNaming(null); if (parent === here) setToast(`Made “${v}”`); else { setToast(`Made “${v}” in Future`); } void id; }}>
                <input name="n" autoFocus placeholder="Name the new capsule" aria-label="New capsule name" style={{ flex: 1, minWidth: 0, border: 0, background: 'transparent', outline: 'none', color: '#fff', fontFamily: 'var(--serif)', fontSize: 16 }} />
                <button className="press" type="submit" style={{ fontWeight: 600 }}>Create</button>
                <button className="press" type="button" aria-label="Cancel" onClick={() => setNaming(null)} style={{ opacity: .7 }}>✕</button>
              </form>
            : <div className="selbar">
                <span style={{ flex: 1, opacity: .8 }}>{selIds.length ? `${selIds.length} selected` : 'Tap to select'}</span>
                <button className="press" disabled={!selIds.length} onClick={() => setMoving(selIds)}>Move</button>
                <button className="press" disabled={!selIds.length} onClick={() => setNaming('from-sel')}>New capsule</button>
                <button className="press" disabled={!selIds.length} style={{ color: sure === 'sel' ? '#FFB4A8' : undefined }} onClick={() => { if (sure !== 'sel') { setSure('sel'); return; } selIds.forEach(id => { const i = byId.get(id); if (i) toTrash(i); }); setSel(null); setSure(null); }}>{sure === 'sel' ? 'Sure?' : 'Delete'}</button>
              </div>
        ) : <Capture label={target === INBOX ? 'Save an idea, link or question…' : `Add to ${targetName}…`} onTap={() => setTyping(true)} onPhotos={takePhotos} />}
      </div>
      {sheet}{overlays}
    </div>
  );
};
