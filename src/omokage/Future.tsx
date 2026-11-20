import { useState } from 'react';
import { Belt, Fly } from './Art';
import { useItems, type Item } from './items';
import { CRIMSON, INK, INK2, SKY, ago, todayStr } from './skins';
import { Typing } from './Typing';

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
const Capture = ({ label, onTap }: { label: string; onTap: () => void }) => (
  <button className="pill-input press" onClick={onTap} style={{ position: 'relative', flex: 'none', width: '100%', textAlign: 'left' }}>
    <span className="it" style={{ fontSize: 15.5, color: INK2, flex: 1 }}>{label}</span>
    <span style={{ width: 40, height: 40, borderRadius: '50%', display: 'grid', placeItems: 'center', background: CRIMSON, color: '#fff', fontSize: 22, fontWeight: 300 }}>+</span>
  </button>
);

export const Future = ({ typing, setTyping }: { typing: boolean; setTyping: (b: boolean) => void }) => {
  const { items, add, remove, update } = useItems();
  const [custom, setCustom] = useState<string[]>(loadBoards);
  const [board, setBoard] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [seen, setSeen] = useState(() => localStorage.getItem(HK));
  const mine = items.filter(i => i.kind === 'future');
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
    <Typing mode="future" label={`future · ${target.toLowerCase()}`} prompt={board ? `Into ${board}: an idea, a link, a question.` : 'An idea, a link, a question. It waits in the inbox.'} placeholder="What if…"
      onCancel={() => setTyping(false)} onSave={t => { add({ kind: 'future', body: t, board: target }); setTyping(false); }} />
  );

  if (board) {
    const list = inBoard(board), others = ['Inbox', ...boards].filter(n => n !== board);
    return (
      <div className="screen" style={{ paddingBottom: 12 }}>
        <Decor />
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 6 }}>
          <button className="press" onClick={() => { setBoard(null); setOpen(null); }} style={{ fontSize: 13, color: INK2, padding: '4px 0' }}>‹ Boards</button>
          <span className="it" style={{ fontSize: 20 }}>{board}</span>
          <span className="caps">{list.length} saved</span>
        </div>
        <div className="scroll grow" style={{ position: 'relative', margin: '0 -24px', padding: '14px 24px 16px' }}>
          {list.length === 0 && <div className="it mute" style={{ textAlign: 'center', marginTop: 60, fontSize: 15 }}>A clear sky. Pin the first thing.</div>}
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
            {[0, 1].map(col => <div key={col} style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 20, paddingTop: col ? 14 : 0 }}>{list.map((i, k) => k % 2 !== col ? null : (() => {
              const d = domain(i.body), isQ = i.body.trim().endsWith('?'), isOpen = open === i.id;
              return (
                <div key={i.id} className="pinned" onClick={() => setOpen(isOpen ? null : i.id)} style={{ transform: `rotate(${TILT[k % TILT.length] * .6}deg)`, animation: `enter .4s ${Math.min(k, 8) * 35}ms both` }}>
                  {d && <div className="caps" style={{ marginBottom: 4 }}>↗ {d}</div>}
                  <div className={isQ ? 'it' : ''} style={{ fontSize: isQ ? 15 : 13.5, lineHeight: 1.4, wordBreak: 'break-word', userSelect: 'text', WebkitUserSelect: 'text' }}>{d ? i.body.replace(URL_RE, '').trim() || d : i.body}</div>
                  <div style={{ fontSize: 10, color: INK2, marginTop: 6 }}>{ago(i.day)}</div>
                  {isOpen && (
                    <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(43,50,71,.2)' }}>
                      {others.map(n => <button key={n} className="chip" style={{ height: 28, fontSize: 11.5, padding: '0 10px' }} onClick={() => { update(i.id, { board: n }); setOpen(null); }}>→ {n}</button>)}
                      {d && <a className="chip" style={{ height: 28, fontSize: 11.5, padding: '0 10px', textDecoration: 'none' }} href={i.body.match(URL_RE)![1]} target="_blank" rel="noreferrer">Open</a>}
                      <button className="chip" style={{ height: 28, fontSize: 11.5, padding: '0 10px', color: CRIMSON }} onClick={() => remove(i.id)}>Delete</button>
                    </div>
                  )}
                </div>
              );
            })())}</div>)}
          </div>
        </div>
        <Capture label={`Add to ${board}…`} onTap={() => setTyping(true)} />
        {sheet}
      </div>
    );
  }

  const shown = boards.slice(0, 5);
  return (
    <div className="screen">
      <Decor />
      <button className="press" onClick={() => setBoard('Inbox')} style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 10, paddingTop: 12, textAlign: 'left' }}>
        <Pennant n={inbox.length} />
        <span className="it" style={{ fontSize: 15 }}>{inbox.length ? 'in the inbox, waiting for a home' : 'the inbox is clear'}</span>
      </button>

      <div className="scroll" style={{ position: 'relative', margin: '14px -24px 0', padding: '10px 24px 8px', maxHeight: 310 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '22px 14px', alignItems: 'start' }}>
          {shown.map((b, k) => {
            const list = inBoard(b);
            return (
              <button key={b} className="pinned press" onClick={() => setBoard(b)} style={{ minHeight: k % 3 === 0 ? 136 : 112, transform: `rotate(${TILT[k % TILT.length]}deg) translateY(${k % 2 ? -6 : 0}px)`, display: 'flex', flexDirection: 'column', animation: `enter .45s ${k * 50}ms both` }}>
                <span className="serif" style={{ fontSize: 19 }}>{b}</span>
                {list.slice(0, 2).map(x => <span key={x.id} className={x.body.trim().endsWith('?') ? 'it' : ''} style={{ fontSize: 12.5, lineHeight: 1.4, color: x.body.trim().endsWith('?') ? INK : INK2, marginTop: 5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{domain(x.body) ? '↗ ' + domain(x.body) : x.body}</span>)}
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
      </div>

      {resurface ? (
        <div style={{ position: 'relative', marginTop: 18, animation: 'enter .5s .15s both' }}>
          <div className="caps">still excited about this?</div>
          <div className="it" style={{ fontSize: 23, lineHeight: 1.3, marginTop: 10, maxWidth: 310, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{resurface.body}</div>
          <div style={{ fontSize: 11.5, color: INK2, marginTop: 8 }}>{bOf(resurface)} · saved {ago(resurface.day)}</div>
          <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
            <button className="chip on" style={{ height: 38, padding: '0 18px' }} onClick={markSeen}>Yes, keep it</button>
            <button className="chip" style={{ height: 38, padding: '0 18px' }} onClick={() => { remove(resurface.id); markSeen(); }}>Let it go</button>
          </div>
        </div>
      ) : mine.length === 0 ? (
        <div style={{ position: 'relative', marginTop: 24 }}>
          <div className="caps">to begin</div>
          <div className="it" style={{ fontSize: 21, lineHeight: 1.35, marginTop: 10, maxWidth: 300, color: INK }}>Save anything that pulls at you: a place, a question, a someday.</div>
        </div>
      ) : null}

      <div className="grow" />
      <Capture label="Save an idea, link or question…" onTap={() => setTyping(true)} />
      {sheet}
    </div>
  );
};
