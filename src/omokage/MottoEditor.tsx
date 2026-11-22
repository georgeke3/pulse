import { useEffect, useState } from 'react';
import { useApp } from '../store';
import { ActionBar } from './Actions';
import { Sheet } from './Sheet';
import { haptic } from './haptics';
import { CRIMSON, INK2 } from './skins';

/** The hidden motto card (circle your finger on the Home motto three times). Add, edit and delete the mottos Home rotates through. */
export const MottoEditor = ({ onClose }: { onClose: () => void }) => {
  const { state, addMotto, deleteMotto, updateMotto } = useApp();
  const [fresh, setFresh] = useState('');
  const [edit, setEdit] = useState<{ old: string; draft: string } | null>(null);
  const [sure, setSure] = useState<string | null>(null);
  const [cancelSure, setCancelSure] = useState(false);
  useEffect(() => { if (!sure) return; const t = setTimeout(() => setSure(null), 3200); return () => clearTimeout(t); }, [sure]);
  useEffect(() => { if (!cancelSure) return; const t = setTimeout(() => setCancelSure(false), 3200); return () => clearTimeout(t); }, [cancelSure]);
  const today = state.mottos.length ? Math.floor(Date.now() / 864e5) % state.mottos.length : -1;
  const add = () => { const t = fresh.trim(); if (!t) return; addMotto(t); setFresh(''); haptic(8); };
  const saveEdit = () => { if (!edit) return; const t = edit.draft.trim(); if (t && t !== edit.old) updateMotto(edit.old, t); setEdit(null); setCancelSure(false); haptic(8); };
  const cancelEdit = () => { if (!edit) return; if (edit.draft.trim() !== edit.old && !cancelSure) { setCancelSure(true); return; } setEdit(null); setCancelSure(false); };
  return (
    <Sheet mode="home">
      <div className="caps" style={{ textAlign: 'center', padding: '12px 0 0' }}>home · mottos</div>
      <div className="scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '14px 24px 10px' }}>
        <div className="it" style={{ fontSize: 14, color: INK2, marginBottom: 12 }}>Home shows one a day, in turn.</div>
        <textarea value={fresh} onChange={e => setFresh(e.target.value)} placeholder="Add a motto…" aria-label="New motto" style={{ minHeight: 64 }} />
        <button className="chip on press" onClick={add} disabled={!fresh.trim()} style={{ marginTop: 8, height: 40, opacity: fresh.trim() ? 1 : .35 }}>Add</button>
        <div className="caps" style={{ margin: '20px 0 4px' }}>{state.mottos.length} motto{state.mottos.length === 1 ? '' : 's'}</div>
        {state.mottos.length === 0 && <div className="it mute" style={{ fontSize: 15, padding: '10px 0' }}>None yet. Home shows “Small, steady, and kind.” until you add one.</div>}
        {state.mottos.map((m, i) => (
          <div key={m} style={{ padding: '12px 0', borderBottom: '1px solid rgba(43,50,71,.08)' }}>
            {edit?.old === m ? (
              <>
                <textarea value={edit.draft} autoFocus onChange={e => setEdit({ old: m, draft: e.target.value })} aria-label="Edit motto" style={{ minHeight: 70 }} />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button className="chip press" onClick={cancelEdit} style={{ height: 36, ...(cancelSure ? { background: CRIMSON, color: '#fff', boxShadow: 'none' } : {}) }}>{cancelSure ? 'Discard?' : 'Cancel'}</button>
                  <button className="chip on press" onClick={saveEdit} disabled={!edit.draft.trim()} style={{ height: 36, flex: 1, opacity: edit.draft.trim() ? 1 : .35 }}>Save</button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <button className="press" onClick={() => { setEdit({ old: m, draft: m }); setCancelSure(false); }} aria-label={`Edit: ${m}`} style={{ flex: 1, textAlign: 'left' }}>
                  <span className="it" style={{ fontSize: 17, lineHeight: 1.4, display: 'block' }}>{m}</span>
                  {i === today && <span className="caps" style={{ fontSize: 8.5 }}>today’s</span>}
                </button>
                <button className="chip press" onClick={() => (sure === m ? (deleteMotto(m), setSure(null)) : setSure(m))} style={{ height: 30, fontSize: 12, flex: 'none', color: sure === m ? '#fff' : CRIMSON, background: sure === m ? CRIMSON : undefined }}>{sure === m ? 'Tap again' : 'Delete'}</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <ActionBar cancel="Close" dirty={!!fresh.trim() || (!!edit && edit.draft.trim() !== edit.old)} onCancel={onClose} />
    </Sheet>
  );
};
