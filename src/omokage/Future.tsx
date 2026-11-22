import { useNavState } from './nav';
import { Drg, Sym, DrgFit } from './Sym';
import { useEffect, useState } from 'react';
import { Belt, Fly } from './Art';
import { addImage, copyImages, dropImages, useImg, type ImgRef } from './images';
import { imgsOf, useItems, type Item } from './items';
import { CRIMSON, INK, INK2, SKY, ago, todayStr } from './skins';
import { Typing } from './Typing';
import { Viewer, type Shot } from './Viewer';
import { PinEdit } from './PinEdit';

export const TRASH = '__trash';
const KEEP_DAYS = 30;
const FADE = 'linear-gradient(to bottom, transparent 0, #000 16px, #000 calc(100% - 28px), transparent 100%)';

const BK = 'omokage_boards', HK = 'omokage_resurface_seen';
const loadBoards = (): string[] => { try { return JSON.parse(localStorage.getItem(BK) || '[]'); } catch { return []; } };
const URL_RE = /(https?:\/\/[^\s]+)/i;
const domain = (s: string) => { const m = s.match(URL_RE); if (!m) return null; try { return new URL(m[1]).hostname.replace(/^www\./, ''); } catch { return null; } };
const TILT = [-2.5, 2.2, -1.4, 1.8, -1.9, 1.2];

const Decor = () => (
  <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 393 740" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <Belt d="M-30 660 C 90 600, 200 640, 290 550 S 400 370, 450 340" c={CRIMSON} w={4} o={.3} stitch={false} />
    <path d="M352 362 L400 346 L384 374 L402 394Z" fill={CRIMSON} opacity=".75" />
    <Fly x={318} y={540} s={.8} c={SKY} o={.9} st="glow" /><Fly x={352} y={512} s={.6} c={SKY} o={.8} st="glow" d={1} />
    <Fly x={290} y={518} s={.45} c={SKY} o={.7} st="glow" d={2} /><Fly x={372} y={552} s={.4} c={SKY} o={.6} st="glow" d={.6} />
  </svg>
);
const Pennant = ({ n }: { n: number }) => (
  <svg width="34" height="22" viewBox="0 0 34 22" aria-hidden="true"><path d="M0 0 H34 L26 11 L34 22 H0Z" fill={CRIMSON} /><text x="12" y="15.5" fontSize="12" fontWeight="600" fill="#fff" textAnchor="middle" fontFamily="Inter, sans-serif">{n}</text></svg>
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

export const Future = () => {
  const { items, add, remove, update } = useItems();
  const [custom, setCustom] = useState<string[]>(loadBoards);
  const [board, setBoard] = useNavState<string | null>('future.board', null);
  const [naming, setNaming] = useState(false);
  const [open, setOpen] = useNavState<string | null>('future.open', null, 'replace');
  const [typing, setTyping] = useNavState('future.compose', false);
  // arriving from a day's full page: scroll the pin into view
  const [focusId] = useNavState<string | null>('future.focus', null);
  useEffect(() => { if (!focusId) return; const t = setTimeout(() => document.querySelector(`[data-pin="${focusId}"]`)?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 350); return () => clearTimeout(t); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const [seen, setSeen] = useState(() => localStorage.getItem(HK));
  const [view, setView] = useNavState<{ shots: Shot[]; start: number } | null>('future.view', null);
  const [photosOnly, setPhotosOnly] = useNavState('future.photosOnly', false, 'replace');
  const [allPhotos, setAllPhotos] = useNavState('future.allPhotos', false);
  const [pre, setPre] = useState<ImgRef[]>([]);
  const [editing, setEditing] = useNavState<Item | null>('future.editing', null);
  const [sure, setSure] = useState<string | null>(null);
  const takePhotos = async (files: File[]) => { const got: ImgRef[] = []; for (const f of files) { try { got.push(await addImage(f)); } catch { /* skip unreadable */ } } if (got.length) { setPre(got); setTyping(true); } };
  /** Open the viewer on photo k of `item`, browsing through every photo in `list`. */
  const openPic = (list: Item[], item: Item, k: number) => {
    let start = k; for (const x of list) { if (x.id === item.id) break; start += imgsOf(x).length; }
    setView({ shots: shotsOf(list), start });
  };
  const all = items.filter(i => i.kind === 'future');
  const trash = all.filter(i => i.board === TRASH).sort((a, b) => String(b.meta?.trashedAt ?? '').localeCompare(String(a.meta?.trashedAt ?? '')));
  const mine = all.filter(i => i.board !== TRASH);
  // deleting moves a pin to the trash (restorable); it's gone for good when emptied, or after 30 days
  const toTrash = (i: Item) => { update(i.id, { board: TRASH, meta: { ...(i.meta ?? {}), trashedFrom: i.board || 'Inbox', trashedAt: new Date().toISOString() } }); setOpen(null); setSure(null); };
  const restore = (i: Item) => { const { trashedFrom, trashedAt: _t, ...rest } = (i.meta ?? {}) as Record<string, unknown>; update(i.id, { board: String(trashedFrom || 'Inbox'), meta: rest }); };
  useEffect(() => { for (const i of trash) if (Date.now() - new Date(String(i.meta?.trashedAt ?? i.at)).getTime() > KEEP_DAYS * 864e5) remove(i.id); }, [trash.length]); // eslint-disable-line react-hooks/exhaustive-deps
  const bOf = (i: Item) => i.board || 'Inbox';
  const boards = [...custom, ...Array.from(new Set(mine.map(bOf)))].filter((b, k, a) => b !== 'Inbox' && a.indexOf(b) === k);
  const inBoard = (b: string) => mine.filter(i => bOf(i) === b);
  const inbox = inBoard('Inbox');
  const stale = mine.filter(i => Date.now() - new Date(i.at).getTime() > 14 * 864e5);
  const resurface = seen === todayStr() || !stale.length ? null : stale[new Date().getDate() % stale.length];
  const markSeen = () => { localStorage.setItem(HK, todayStr()); setSeen(todayStr()); };
  const addBoard = (n: string) => { const v = Array.from(new Set([...custom, n])); setCustom(v); localStorage.setItem(BK, JSON.stringify(v)); setNaming(false); };
  const target = board ?? 'Inbox';
  const sheet = typing && (
    <Typing mode="future" photos initialImages={pre} label={`future · ${target.toLowerCase()}`} prompt={board ? `Into ${board}: an idea, a link, a question.` : 'An idea, a link, a question. It waits in the inbox.'} placeholder="What if…"
      onCancel={() => { void dropImages(pre.map(x => x.id)); setPre([]); setTyping(false); }}
      onSave={(t, _tags, imgs) => { add({ kind: 'future', body: t, board: target, meta: imgs.length ? { images: imgs } : undefined }); setPre([]); setTyping(false); }} />
  );

  const viewer = <>{view && <Viewer shots={view.shots} start={view.start} onClose={() => setView(null)} />}
    {editing && <PinEdit item={editing} onClose={() => setEditing(null)} onSave={(body, imgs) => { const { images: _i, ...meta } = (editing.meta ?? {}) as Record<string, unknown>; update(editing.id, { body, meta: imgs.length ? { ...meta, images: imgs } : meta }); setEditing(null); }} />}</>;
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
        {sheet}{viewer}
      </div>
    );
  }

  if (board === TRASH) {
    return (
      <div className="screen" style={{ paddingBottom: 12, touchAction: 'pan-y' }}>
        <Decor />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 6 }}>
          <span className="it" style={{ fontSize: 20 }}>Trash</span>
          <span className="caps">{trash.length}</span>
        </div>
        <div className="it" style={{ position: 'relative', fontSize: 12.5, color: INK2, paddingBottom: 6 }}>Deleted pins wait here for {KEEP_DAYS} days.</div>
        <div className="scroll grow" style={{ position: 'relative', margin: '-6px -24px 0', padding: '18px 24px 16px', display: 'flex', flexDirection: 'column', gap: 12, WebkitMaskImage: FADE, maskImage: FADE }}>
          {trash.length === 0 && <div className="it mute" style={{ textAlign: 'center', marginTop: 60, fontSize: 15 }}>Nothing thrown away.<Drg n="tiny" w={90} style={{ margin: '16px auto 0' }} /></div>}
          {trash.map(i => (
            <div key={i.id} className="pinned" style={{ flex: 'none', opacity: .92 }}>
              <Pics item={i} onOpen={n => openPic(trash, i, n)} />
              {i.body && <div style={{ fontSize: 13.5, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{i.body}</div>}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 10 }}>
                <span style={{ fontSize: 10.5, color: INK2, flex: 1 }}>from {String(i.meta?.trashedFrom ?? 'Inbox')} · {ago(String(i.meta?.trashedAt ?? i.at).slice(0, 10))}</span>
                <button className="chip" style={{ height: 30, fontSize: 12 }} onClick={() => restore(i)}>Restore</button>
                <button className="chip" style={{ height: 30, fontSize: 12, color: sure === i.id ? '#fff' : CRIMSON, background: sure === i.id ? CRIMSON : undefined }} onClick={() => (sure === i.id ? (remove(i.id), setSure(null)) : setSure(i.id))}>{sure === i.id ? 'Delete forever' : 'Delete'}</button>
              </div>
            </div>
          ))}
        </div>
        {trash.length > 1 && <button className="chip press" style={{ position: 'relative', height: 44, color: sure === 'all' ? '#fff' : CRIMSON, background: sure === 'all' ? CRIMSON : '#fff' }} onClick={() => (sure === 'all' ? (trash.forEach(i => remove(i.id)), setSure(null)) : setSure('all'))}>{sure === 'all' ? `Tap again to delete ${trash.length} for good` : 'Empty trash'}</button>}
        {viewer}
      </div>
    );
  }

  if (board) {
    const list = inBoard(board), others = ['Inbox', ...boards].filter(n => n !== board);
    return (
      <div className="screen" style={{ paddingBottom: 12, touchAction: 'pan-y' }}>
        <Decor />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 6 }}>
          <span className="it" style={{ fontSize: 20 }}>{board}</span>
          {list.some(i => imgsOf(i).length)
            ? <button className="press caps" onClick={() => setPhotosOnly(v => !v)} style={{ padding: '4px 0' }}>{photosOnly ? 'notes' : 'photos'}</button>
            : <span className="caps">{list.length} saved</span>}
        </div>
        {/* the list runs the full height of the screen: it scrolls under the capture bar and fades out under the header,
            instead of ending in a hard-edged box between them */}
        <div className="scroll grow" style={{ position: 'relative', margin: '-6px -24px -12px', padding: photosOnly ? '12px 24px 92px' : '20px 24px 92px', WebkitMaskImage: FADE, maskImage: FADE }}>
          {photosOnly && (() => { const shots = shotsOf(list); return <Grid shots={shots} onOpen={k => setView({ shots, start: k })} />; })()}
          {!photosOnly && list.length === 0 && <div className="it mute" style={{ textAlign: 'center', marginTop: 60, fontSize: 15 }}>A clear sky. Pin the first thing.<div style={{ margin: '18px auto 0', width: 120 }}><DrgFit n="future" w={120} h={91} /></div></div>}
          {!photosOnly && <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            {[0, 1].map(col => <div key={col} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20, paddingTop: col ? 14 : 0 }}>{list.map((i, k) => k % 2 !== col ? null : (() => {
              const d = domain(i.body), isQ = i.body.trim().endsWith('?'), isOpen = open === i.id;
              return (
                <div key={i.id} data-pin={i.id} className="pinned" onClick={() => { setOpen(isOpen ? null : i.id); setSure(null); }} style={{ transform: `rotate(${TILT[k % TILT.length] * .6}deg)`, animation: `enter .4s ${Math.min(k, 8) * 35}ms both` }}>
                  <Pics item={i} onOpen={n => openPic(list, i, n)} />
                  {d && <div className="caps" style={{ marginBottom: 4 }}>↗ {d}</div>}
                  {(i.body || !imgsOf(i).length) && <div className={isQ ? 'it' : ''} style={{ fontSize: isQ ? 15 : 13.5, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word', userSelect: 'text', WebkitUserSelect: 'text' }}>{d ? i.body.replace(URL_RE, '').trim() || d : i.body}</div>}
                  <div style={{ fontSize: 10, color: INK2, marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span>{ago(i.day)}</span><Sym n="seal" on={!!i.meta?.kept} s={18} o={i.meta?.kept ? 1 : .6} /></div>
                  {isOpen && (
                    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(43,50,71,.2)' }}>
                      <button className="chip on" style={{ height: 28, fontSize: 11.5, padding: '0 12px' }} onClick={() => { setEditing(i); setOpen(null); }}>Edit</button>
                      {others.map(n => <button key={n} className="chip" style={{ height: 28, fontSize: 11.5, padding: '0 10px' }} onClick={() => { update(i.id, { board: n }); setOpen(null); }}>→ {n}</button>)}
                      {d && <a className="chip" style={{ height: 28, fontSize: 11.5, padding: '0 10px', textDecoration: 'none' }} href={i.body.match(URL_RE)![1]} target="_blank" rel="noreferrer">Open</a>}
                      <button className="chip" style={{ height: 28, fontSize: 11.5, padding: '0 10px', color: sure === i.id ? '#fff' : CRIMSON, background: sure === i.id ? CRIMSON : undefined }} onClick={() => (sure === i.id ? toTrash(i) : setSure(i.id))}>{sure === i.id ? 'Move to trash?' : 'Delete'}</button>
                    </div>
                  )}
                </div>
              );
            })())}</div>)}
          </div>}
        </div>
        <div style={{ position: 'absolute', left: 24, right: 24, bottom: 12, zIndex: 2 }}><Capture label={`Add to ${board}…`} onTap={() => setTyping(true)} onPhotos={takePhotos} /></div>
        {sheet}{viewer}
      </div>
    );
  }

  const shown = boards.slice(0, 5);
  return (
    <div className="screen">
      <Decor />
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 12 }}>
        <button className="press" onClick={() => setBoard('Inbox')} style={{ display: 'flex', alignItems: 'center', gap: 10, textAlign: 'left' }}>
          {inbox.length ? <Pennant n={inbox.length} /> : <Drg n="tiny" w={34} />}
          <span className="it" style={{ fontSize: 15 }}>{inbox.length ? 'in the inbox, waiting for a home' : 'the inbox is clear'}</span>
        </button>
        {photoItems.length > 0 && <button className="chip press" style={{ height: 34 }} onClick={() => setAllPhotos(true)}>Photos · {photoItems.reduce((n, i) => n + imgsOf(i).length, 0)}</button>}
      </div>

      {/* boards and the resurfaced idea share one full-height scroll that runs under the capture bar (no boxed area) */}
      <div className="scroll grow" style={{ position: 'relative', margin: '4px -24px -12px', padding: '20px 24px 96px', WebkitMaskImage: FADE, maskImage: FADE }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px 14px', alignItems: 'start' }}>
          {shown.map((b, k) => {
            const list = inBoard(b);
            return (
              <button key={b} className="pinned press" onClick={() => setBoard(b)} style={{ minHeight: k % 3 === 0 ? 136 : 112, transform: `rotate(${TILT[k % TILT.length]}deg) translateY(${k % 2 ? -6 : 0}px)`, display: 'flex', flexDirection: 'column', animation: `enter .45s ${k * 50}ms both` }}>
                <span className="serif" style={{ fontSize: 19 }}>{b}</span>
                {list.filter(x => x.body.trim()).slice(0, 2).map(x => <span key={x.id} className={x.body.trim().endsWith('?') ? 'it' : ''} style={{ fontSize: 12.5, lineHeight: 1.4, color: x.body.trim().endsWith('?') ? INK : INK2, marginTop: 5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{domain(x.body) ? '↗ ' + domain(x.body) : x.body}</span>)}
                {list.some(x => imgsOf(x).length) && <span style={{ display: 'flex', gap: 4, marginTop: 6 }}>{list.flatMap(x => imgsOf(x)).slice(0, 3).map(r => <Mini key={r.id} id={r.id} s={34} />)}</span>}
                <span style={{ marginTop: 'auto', paddingTop: 8, fontSize: 10, color: INK2 }}>{list.length} saved</span>
              </button>
            );
          })}
          {naming
            ? <form onSubmit={e => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get('n') || '').trim(); if (v) addBoard(v); else setNaming(false); }}
                style={{ height: 64, borderRadius: 6, border: '1.2px dashed rgba(43,50,71,.3)', padding: '8px 12px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <input name="n" autoFocus placeholder="Name a board" aria-label="Board name" onBlur={e => { if (!e.currentTarget.value.trim()) setNaming(false); }} style={{ border: 0, background: 'transparent', outline: 'none', fontFamily: 'var(--serif)', fontSize: 17, width: '100%' }} />
              </form>
            : <button className="press" onClick={() => setNaming(true)} style={{ height: 56, borderRadius: 6, border: '1.2px dashed rgba(43,50,71,.3)', fontSize: 13, color: INK2, transform: 'rotate(1.5deg)', marginTop: 8 }}>+ new board</button>}
        </div>
        {trash.length > 0 && <button className="press" onClick={() => setBoard(TRASH)} style={{ display: 'block', margin: '16px auto 0', fontSize: 12.5, color: INK2 }}>Trash · {trash.length}</button>}

      {resurface ? (
        <div style={{ position: 'relative', marginTop: 56, animation: 'enter .5s .15s both' }}>
          <Drg n="peek" w={84} style={{ position: 'absolute', right: 0, top: -44 }} />
          <div className="caps">still excited about this?</div>
          {imgsOf(resurface).length > 0 && <div style={{ marginTop: 10 }}><Mini id={imgsOf(resurface)[0].id} s={72} /></div>}
          {resurface.body && <div className="it" style={{ fontSize: 23, lineHeight: 1.3, marginTop: 10, maxWidth: 262, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{resurface.body}</div>}
          <div style={{ fontSize: 11.5, color: INK2, marginTop: 8 }}>{bOf(resurface)} · saved {ago(resurface.day)}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="chip on" style={{ height: 38, padding: '0 18px', gap: 8 }} onClick={() => { update(resurface.id, { meta: { ...(resurface.meta ?? {}), kept: todayStr() } }); markSeen(); }}><Sym n="seal" on s={18} /> Yes, keep it</button>
            <button className="chip" style={{ height: 38, padding: '0 18px', ...(sure === 'rs' ? { background: CRIMSON, color: '#fff' } : {}) }} onClick={() => { if (sure !== 'rs') { setSure('rs'); return; } toTrash(resurface); markSeen(); }}>{sure === 'rs' ? 'Tap again to let go' : 'Let it go'}</button>
          </div>
        </div>
      ) : mine.length === 0 ? (
        <div style={{ position: 'relative', marginTop: 24 }}>
          <div className="caps">to begin</div>
          <div className="it" style={{ fontSize: 21, lineHeight: 1.35, marginTop: 10, maxWidth: 300, color: INK }}>Save anything that pulls at you: a place, a question, a someday.</div>
          <div style={{ margin: '22px 0 0 auto', width: 120 }}><DrgFit n="future" w={120} h={91} o={.9} /></div>
        </div>
      ) : null}
      </div>
      <div style={{ position: 'absolute', left: 24, right: 24, bottom: 12, zIndex: 2 }}><Capture label="Save an idea, link or question…" onTap={() => setTyping(true)} onPhotos={takePhotos} /></div>
      {sheet}{viewer}
    </div>
  );
};
