import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { useItems } from './items';
import { SKINS } from './skins';

const useVVHeight = () => {
  const [h, setH] = useState<number | null>(null);
  useEffect(() => {
    const vv = window.visualViewport; if (!vv) return;
    const f = () => setH(vv.height);
    f(); vv.addEventListener('resize', f); return () => vv.removeEventListener('resize', f);
  }, []);
  return h;
};
const BOARDS = ['Inbox', 'Ideas', 'Questions', 'Wishes'];

export const Notes = ({ kind }: { kind: 'past' | 'future' }) => {
  const S = SKINS[kind];
  const { items, add, remove } = useItems();
  const { state } = useApp();
  const [text, setText] = useState('');
  const [board, setBoard] = useState('Inbox');
  const vvh = useVVHeight();
  const mine = items.filter(i => i.kind === kind && (kind === 'past' || (board === 'All' ? true : (i.board ?? 'Inbox') === board)));
  const legacy = kind === 'past'
    ? Object.entries(state.days).filter(([, d]) => d.note?.trim()).map(([day, d]) => ({ id: 'legacy-' + day, day, body: d.note!.trim(), at: day + 'T23:59:00Z', legacy: true as const }))
    : [];
  const list = [...mine.map(m => ({ ...m, legacy: false as const })), ...legacy].sort((a, b) => b.at.localeCompare(a.at)).slice(0, 40);
  const send = () => { const t = text.trim(); if (!t) return; add({ kind, body: t, board: kind === 'future' ? board : null }); setText(''); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: vvh ? Math.min(vvh, window.innerHeight) - 0 : '100%', maxHeight: '100%', padding: '14px 16px 8px' }}>
      {kind === 'future' && (
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
          {BOARDS.map(b => <button key={b} onClick={() => setBoard(b)} style={{ padding: '6px 12px', borderRadius: 999, border: `1.5px solid ${S.accent}`, background: board === b ? S.accent : 'transparent', color: board === b ? '#fff' : S.ink, fontFamily: 'inherit', fontSize: 13 }}>{b}</button>)}
        </div>
      )}
      <div style={{ flex: 1, overflowY: 'auto', overscrollBehavior: 'contain' }}>
        {list.length === 0 && <div style={{ color: S.mute, textAlign: 'center', marginTop: 40, fontSize: 14 }}>{kind === 'past' ? 'what happened, how it felt…' : 'ideas, questions, someday…'}</div>}
        {list.map(i => (
          <div key={i.id} style={{ background: S.card, border: `1px ${S.dash ? 'dashed' : 'solid'} ${S.line}`, borderRadius: 14, padding: '9px 12px', marginBottom: 8, color: S.ink, fontSize: 15, position: 'relative' }}>
            <div style={{ fontSize: 11, color: S.mute, marginBottom: 2 }}>{i.day}</div>
            <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{i.body}</div>
            {!i.legacy && <button onClick={() => remove(i.id)} aria-label="delete" style={{ position: 'absolute', right: 6, top: 4, background: 'none', border: 0, color: S.mute, fontSize: 16 }}>×</button>}
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', paddingTop: 8 }}>
        <textarea value={text} onChange={e => setText(e.target.value)} rows={2} placeholder={kind === 'past' ? 'write it down…' : `add to ${board}…`}
          style={{ flex: 1, resize: 'none', borderRadius: 14, border: `1.5px ${S.dash ? 'dashed' : 'solid'} ${S.line}`, background: S.card, padding: '9px 12px', fontSize: 16, fontFamily: 'inherit', color: S.ink, outline: 'none' }} />
        <button onClick={send} style={{ height: 46, padding: '0 16px', borderRadius: 14, border: 0, background: S.accent, color: '#fff', fontSize: 15, fontFamily: 'inherit' }}>Add</button>
      </div>
    </div>
  );
};
