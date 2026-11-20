import { useState } from 'react';
import { useItems } from './items';
import { SERIF, SKINS, todayStr } from './skins';
import { Typing } from './Typing';

const S = SKINS.future;
const BK = 'omokage_boards', HK = 'omokage_resurface_hidden';
const loadBoards = (): string[] => { try { return JSON.parse(localStorage.getItem(BK) || '[]'); } catch { return []; } };

export const Future = ({ typing, setTyping }: { typing: boolean; setTyping: (b: boolean) => void }) => {
  const { items, add, remove } = useItems();
  const [custom, setCustom] = useState<string[]>(loadBoards);
  const [board, setBoard] = useState<string | null>(null);
  const [naming, setNaming] = useState(false);
  const [hiddenDay, setHiddenDay] = useState(() => localStorage.getItem(HK));
  const mine = items.filter(i => i.kind === 'future');
  const names = ['Inbox', ...custom.filter(c => c !== 'Inbox'), ...Array.from(new Set(mine.map(i => i.board || 'Inbox'))).filter(b => b !== 'Inbox' && !custom.includes(b))];
  const count = (b: string) => mine.filter(i => (i.board || 'Inbox') === b).length;
  const stale = mine.filter(i => Date.now() - new Date(i.at).getTime() > 14 * 864e5);
  const resurface = hiddenDay === todayStr() ? null : stale.length ? stale[new Date().getDate() % stale.length] : null;
  const hide = () => { localStorage.setItem(HK, todayStr()); setHiddenDay(todayStr()); };
  const addBoard = (n: string) => { const v = [...custom, n]; setCustom(v); localStorage.setItem(BK, JSON.stringify(v)); setNaming(false); };

  if (board) {
    const list = mine.filter(i => (i.board || 'Inbox') === board);
    return (
      <>
        <div style={{ flex: 1, padding: '6px 16px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button onClick={() => setBoard(null)} style={{ background: 'none', border: 0, padding: '4px 0', fontSize: 13, color: S.mute, fontFamily: 'inherit' }}>‹ Boards</button>
            <span style={{ fontFamily: SERIF, fontSize: 18 }}>{board}</span>
            <button onClick={() => setTyping(true)} style={{ background: S.ink, color: '#D3DAE3', border: 0, borderRadius: 99, padding: '6px 14px', fontSize: 13, fontFamily: 'inherit' }}>+ Add</button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {list.length === 0 && <div style={{ color: S.mute, fontSize: 13, textAlign: 'center', marginTop: 30 }}>Nothing here yet. Add an idea, link or question.</div>}
            {list.map(i => (
              <div key={i.id} style={{ border: `1.5px dashed ${S.dash}`, borderRadius: 10, padding: '8px 10px', background: S.card, display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, fontSize: 14, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{i.body}<div style={{ fontSize: 11, color: S.mute, marginTop: 2 }}>{i.day}</div></div>
                <button onClick={() => remove(i.id)} aria-label="delete" style={{ background: 'none', border: 0, color: S.mute, fontSize: 18, alignSelf: 'flex-start', padding: 0 }}>×</button>
              </div>
            ))}
          </div>
        </div>
        {typing && <Typing mode="future" heading="Future" prompt={`Add to ${board}`} onCancel={() => setTyping(false)} onSave={t => { add({ kind: 'future', body: t, board }); setTyping(false); }} />}
      </>
    );
  }

  return (
    <>
      <div style={{ flex: 1, padding: '6px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
        <div style={{ fontSize: 12, color: S.mute }}>Boards</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {names.map(b => (
            <button key={b} onClick={() => setBoard(b)} style={{ height: 78, border: `1.5px dashed ${S.dash}`, borderRadius: 10, background: S.card, padding: '10px 12px', textAlign: 'left', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', fontFamily: 'inherit', color: S.ink }}>
              <span style={{ fontFamily: SERIF, fontSize: 17 }}>{b}{b === 'Inbox' && count(b) ? ` · ${count(b)}` : ''}</span>
              <span style={{ fontSize: 12, color: S.mute }}>{count(b)} saved</span>
            </button>
          ))}
          {naming
            ? <form onSubmit={e => { e.preventDefault(); const v = String(new FormData(e.currentTarget).get('n') || '').trim(); if (v) addBoard(v); else setNaming(false); }} style={{ height: 78, border: `1.5px dashed ${S.dash}`, borderRadius: 10, padding: 8, boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: 4 }}>
                <input name="n" autoFocus placeholder="Board name" style={{ border: 0, background: 'transparent', fontSize: 16, fontFamily: SERIF, color: S.ink, outline: 'none' }} /><span style={{ fontSize: 11, color: S.mute }}>return to save</span>
              </form>
            : <button onClick={() => setNaming(true)} style={{ height: 78, border: `1.5px dashed ${S.dash}`, borderRadius: 10, background: 'transparent', color: S.mute, fontSize: 14, fontFamily: 'inherit' }}>+ New board</button>}
        </div>
        <button onClick={() => { setBoard('Inbox'); setTyping(true); }} style={{ height: 44, borderRadius: 10, border: 0, background: S.ink, color: '#D3DAE3', fontSize: 14, fontFamily: 'inherit' }}>+ Quick save to Inbox</button>
        <div style={{ flex: 1 }} />
        {resurface && (
          <div style={{ border: `1.5px dashed ${S.dash}`, borderRadius: 10, padding: '8px 10px', background: S.card, marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: S.mute }}>Still excited about this?</div>
            <div style={{ fontFamily: SERIF, fontSize: 17, lineHeight: 1.3, margin: '2px 0 8px' }}>{resurface.body.slice(0, 110)}</div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={hide} style={{ flex: 1, height: 36, borderRadius: 99, border: 0, background: S.ink, color: '#D3DAE3', fontFamily: 'inherit', fontSize: 14 }}>Yes</button>
              <button onClick={hide} style={{ flex: 1, height: 36, borderRadius: 99, border: 0, background: S.chip, color: S.ink, fontFamily: 'inherit', fontSize: 14 }}>Not now</button>
            </div>
          </div>
        )}
      </div>
      {typing && <Typing mode="future" heading="Future" prompt="Add to Inbox" onCancel={() => setTyping(false)} onSave={t => { add({ kind: 'future', body: t, board: 'Inbox' }); setTyping(false); }} />}
    </>
  );
};
