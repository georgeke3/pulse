import { useState } from 'react';
import { useItems, type Item } from './items';
import { ago, todayStr } from './skins';
import { Typing } from './Typing';

const BK = 'omokage_boards', HK = 'omokage_resurface_seen';
const loadBoards = (): string[] => { try { return JSON.parse(localStorage.getItem(BK) || '[]'); } catch { return []; } };
const URL_RE = /(https?:\/\/[^\s]+)/i;
const domain = (s: string) => { const m = s.match(URL_RE); if (!m) return null; try { return new URL(m[1]).hostname.replace(/^www\./, ''); } catch { return null; } };
const TINTS = ['rgba(255,255,255,.72)', 'rgba(155,58,68,.10)', 'rgba(227,214,190,.75)', 'rgba(143,163,184,.28)'];

export const Future = ({ typing, setTyping }: { typing: boolean; setTyping: (b: boolean) => void }) => {
  const { items, add, remove, update } = useItems();
  const [custom, setCustom] = useState<string[]>(loadBoards);
  const [board, setBoard] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [seen, setSeen] = useState(() => localStorage.getItem(HK));
  const mine = items.filter(i => i.kind === 'future');
  const bOf = (i: Item) => i.board || 'Inbox';
  const names = ['Inbox', ...custom.filter(c => c !== 'Inbox'), ...Array.from(new Set(mine.map(bOf))).filter(b => b !== 'Inbox' && !custom.includes(b))];
  const inBoard = (b: string) => mine.filter(i => bOf(i) === b);
  const stale = mine.filter(i => Date.now() - new Date(i.at).getTime() > 14 * 864e5);
  const resurface = seen === todayStr() || !stale.length ? null : stale[new Date().getDate() % stale.length];
  const markSeen = () => { localStorage.setItem(HK, todayStr()); setSeen(todayStr()); };
  const addBoard = (n: string) => { const v = Array.from(new Set([...custom, n])); setCustom(v); localStorage.setItem(BK, JSON.stringify(v)); setNaming(false); };
  const target = board ?? 'Inbox';

  const typingSheet = typing && (
    <Typing mode="future" heading="Future" prompt={`Into ${target}: an idea, a link, a question.`} placeholder="What if…"
      onCancel={() => setTyping(false)} onSave={t => { add({ kind: 'future', body: t, board: target }); setTyping(false); }} />
  );

  if (board) {
    const list = inBoard(board);
    return (
      <div className="screen" style={{ paddingBottom: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <button className="press" onClick={() => { setBoard(null); setOpen(null); }} style={{ fontSize: 13, color: 'var(--fg2)', padding: '4px 0' }}>‹ Boards</button>
          <span className="serif" style={{ fontSize: 20 }}>{board}</span>
          <span className="caps">{list.length} saved</span>
        </div>
        <div className="scroll grow" style={{ paddingBottom: 6 }}>
          {list.length === 0 && <div className="quote mute" style={{ textAlign: 'center', marginTop: 60, fontSize: 15 }}>A blank sky. Add the first thing.</div>}
          <div className="masonry">
            {list.map((i, k) => {
              const d = domain(i.body), isQ = i.body.trim().endsWith('?'), isOpen = open === i.id;
              return (
                <div key={i.id} className="tile mist" onClick={() => setOpen(isOpen ? null : i.id)}
                  style={{ background: TINTS[k % TINTS.length], transform: `rotate(${(k % 3 - 1) * .5}deg)`, animation: `enter .4s ${Math.min(k, 8) * 35}ms both` }}>
                  {isQ && <div className="caps" style={{ color: '#9B3A44', marginBottom: 3 }}>Question</div>}
                  {d && <div className="caps" style={{ marginBottom: 3 }}>↗ {d}</div>}
                  <div className={isQ ? 'quote' : ''} style={{ fontSize: isQ ? 15 : 13.5, wordBreak: 'break-word', userSelect: 'text' }}>{d ? i.body.replace(URL_RE, '').trim() || d : i.body}</div>
                  <div style={{ fontSize: 10.5, color: 'var(--fg2)', marginTop: 5 }}>{ago(i.day)}</div>
                  {isOpen && (
                    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(92,107,130,.35)' }}>
                      {names.filter(n => n !== board).map(n => <button key={n} className="chip press" style={{ height: 26, fontSize: 11.5, padding: '0 9px' }} onClick={() => { update(i.id, { board: n }); setOpen(null); }}>→ {n}</button>)}
                      {d && <a className="chip press" style={{ height: 26, fontSize: 11.5, padding: '0 9px', display: 'inline-flex', alignItems: 'center', textDecoration: 'none' }} href={i.body.match(URL_RE)![1]} target="_blank" rel="noreferrer">Open</a>}
                      <button className="chip press" style={{ height: 26, fontSize: 11.5, padding: '0 9px', color: '#9B3A44' }} onClick={() => remove(i.id)}>Delete</button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <CaptureBar label={`Add to ${board}`} onTap={() => setTyping(true)} />
        {typingSheet}
      </div>
    );
  }

  return (
    <div className="screen">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span className="caps">Boards</span>
        <span style={{ fontSize: 11.5, color: 'var(--fg2)' }}>{mine.length} ideas kept</span>
      </div>
      <div className="boards">
        {names.map((b, k) => {
          const list = inBoard(b), isInbox = b === 'Inbox';
          return (
            <button key={b} className="board mist press" onClick={() => setBoard(b)} style={{ animation: `enter .4s ${k * 40}ms both` }}>
              <span className="peek">{list.slice(0, 3).map((x, n) => <i key={x.id} style={{ background: TINTS[(n + 1) % TINTS.length], transform: `translateY(${n * 4}px)` }} />)}</span>
              <span className="nm">{b}{isInbox && list.length > 0 && <span style={{ marginLeft: 7, display: 'inline-block', minWidth: 18, height: 18, borderRadius: 9, background: '#9B3A44', color: '#fff', fontFamily: 'var(--sans)', fontSize: 10.5, fontWeight: 600, lineHeight: '18px', textAlign: 'center', verticalAlign: 3, padding: '0 5px' }}>{list.length}</span>}</span>
              <span className="ct">{isInbox ? (list.length ? 'to sort' : 'all sorted') : `${list.length} saved`}{list[0] ? ` · ${ago(list[0].day)}` : ''}</span>
            </button>
          );
        })}
        {naming
          ? <form className="board mist" onSubmit={e => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get('n') || '').trim(); if (v) addBoard(v); else setNaming(false); }}>
              <input name="n" autoFocus placeholder="Name a board" onBlur={e => { if (!e.currentTarget.value.trim()) setNaming(false); }} style={{ border: 0, background: 'transparent', fontSize: 18, fontFamily: 'var(--serif)', outline: 'none', width: '100%' }} />
              <span className="ct">return to create</span>
            </form>
          : <button className="board press" onClick={() => setNaming(true)} style={{ border: '1.3px dashed rgba(92,107,130,.55)', borderRadius: 12, alignItems: 'center', justifyContent: 'center', color: 'var(--fg2)', fontSize: 14 }}>+ New board</button>}
      </div>

      {mine.length > 0 && (
        <div>
          <div className="caps" style={{ marginBottom: 6 }}>Lately</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {[...mine].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 3).map((i, k) => (
              <button key={i.id} className="mist press" onClick={() => setBoard(bOf(i))} style={{ flex: 1, minWidth: 0, height: 92, padding: '9px 10px', gap: 4, textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', background: TINTS[(k + 1) % TINTS.length], transform: `rotate(${(k - 1) * .8}deg)` }}>
                <span className={i.body.trim().endsWith('?') ? 'quote' : ''} style={{ fontSize: 12.5, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', wordBreak: 'break-word' }}>{domain(i.body) ? '↗ ' + domain(i.body) : i.body}</span>
                <span style={{ fontSize: 10, color: 'var(--fg2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', flex: 'none' }}>{bOf(i)} · {ago(i.day)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grow" />

      {resurface && (
        <div className="mist" style={{ padding: '11px 13px 12px', animation: 'enter .5s .15s both' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span className="caps">Still excited about this?</span>
            <span style={{ fontSize: 11, color: 'var(--fg2)' }}>{bOf(resurface)} · {ago(resurface.day)}</span>
          </div>
          <div className="quote" style={{ fontSize: 17, lineHeight: 1.35, margin: '5px 0 10px' }}>{resurface.body.slice(0, 120)}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="press" onClick={markSeen} style={{ flex: 1, height: 38, borderRadius: 99, background: '#1F2A44', color: '#E6EBF1', fontSize: 14, fontWeight: 500 }}>Yes, keep it</button>
            <button className="press" onClick={() => { remove(resurface.id); markSeen(); }} style={{ flex: 1, height: 38, borderRadius: 99, background: 'rgba(255,255,255,.6)', fontSize: 14 }}>Let it go</button>
          </div>
        </div>
      )}

      <CaptureBar label="Save an idea, link or question" onTap={() => setTyping(true)} />
      {typingSheet}
    </div>
  );
};

const CaptureBar = ({ label, onTap }: { label: string; onTap: () => void }) => (
  <button className="press" onClick={onTap} style={{ flex: 'none', height: 50, borderRadius: 14, display: 'flex', alignItems: 'center', gap: 12, padding: '0 8px 0 16px', color: '#E6EBF1', background: 'linear-gradient(180deg,#2A3656,#1F2A44)', boxShadow: '0 8px 18px rgba(31,42,68,.28), inset 0 0 0 1px rgba(255,255,255,.08)', position: 'relative', zIndex: 2 }}>
    <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden><path d="M16 3 L18.6 13.4 L29 16 L18.6 18.6 L16 29 L13.4 18.6 L3 16 L13.4 13.4Z" fill="#E7A1A8" /></svg>
    <span style={{ fontSize: 14.5, flex: 1, textAlign: 'left' }}>{label}</span>
    <span style={{ width: 34, height: 34, borderRadius: 10, background: '#9B3A44', display: 'grid', placeItems: 'center', fontSize: 20, lineHeight: 1 }}>+</span>
  </button>
);
