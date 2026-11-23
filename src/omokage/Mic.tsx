import { useEffect, useRef } from 'react';
import { haptic } from './haptics';
import { EMBER, INK } from './skins';
import { clearDictationError, deliver, recoverJob, releaseDictation, startDictation, stopDictation, useDictation, type Job } from './dictation';

export { transcribe } from './dictation';

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
let seq = 0;

/** Tap to start, tap again to stop. The text lands through onText a moment later. Recording itself lives in dictation.ts (saved as it goes, retried, recoverable). */
export const Mic = ({ onText, size = 52 }: { onText: (t: string) => void; size?: number }) => {
  const me = useRef(`mic${++seq}`).current;
  const d = useDictation();
  const live = useRef(true), cb = useRef(onText); cb.current = onText;
  useEffect(() => { live.current = true; return () => { live.current = false; releaseDictation(me); }; }, [me]);

  const mine = d.owner === me, phase = mine ? d.phase : 'idle', secs = d.secs, blocked = d.phase !== 'idle' && !mine;
  const err = d.errOwner === me ? d.err : '';
  useEffect(() => { if (!err) return; const t = setTimeout(clearDictationError, 6000); return () => clearTimeout(t); }, [err]);
  const give = async (id: string, text: string) => { if (text && live.current && await deliver(id)) { cb.current(text); haptic(8); } };

  const tap = async () => {
    if (blocked) return;
    if (phase === 'rec') { stopDictation(); return; }
    if (phase !== 'idle') return;
    const r = await startDictation(me);
    if (r) r.done.then(t => give(r.id, t), () => undefined);
  };
  const recover = async (j: Job) => { try { await give(j.id, await recoverJob(j, me)); } catch { /* shown through state.err */ } };
  const job = d.phase === 'idle' ? d.pending[0] : undefined;

  const on = phase === 'rec';
  return (
    <span style={{ position: 'relative', display: 'inline-flex', flex: 'none' }}>
      {on && (
        <span aria-live="polite" style={{ position: 'absolute', right: size + 10, top: '50%', transform: 'translateY(-50%)', whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderRadius: 99, background: 'rgba(255,255,255,.97)', boxShadow: '0 0 0 1px rgba(43,50,71,.12), 0 6px 16px rgba(43,50,71,.08)', fontSize: 13.5, color: INK }}>
          <i style={{ width: 8, height: 8, borderRadius: 4, background: EMBER, animation: 'omk-rec 1s ease-in-out infinite' }} />
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>{clock(secs)}</span>
          <span style={{ opacity: .6 }}>· tap to stop</span>
        </span>
      )}
      {job && !on && phase === 'idle' && (
        <button type="button" className="press" onClick={() => void recover(job)} aria-label="Recover unsent recording"
          style={{ position: 'absolute', right: size + 10, top: '50%', transform: 'translateY(-50%)', whiteSpace: 'nowrap', padding: '8px 13px', borderRadius: 99, fontSize: 12.5, color: '#fff', background: EMBER, boxShadow: '0 4px 14px rgba(43,50,71,.14)' }}>
          {job.state === 'done' ? 'Insert saved recording' : 'Retry saved recording'}{d.pending.length > 1 ? ` · ${d.pending.length}` : ''}
        </button>
      )}
      <button type="button" className="press" aria-label={on ? 'Stop recording' : 'Dictate'} onClick={() => void tap()} onMouseDown={e => e.preventDefault()} onContextMenu={e => e.preventDefault()}
        style={{ width: size, height: size, borderRadius: size / 2, display: 'grid', placeItems: 'center', WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
          opacity: blocked ? .45 : 1, background: on ? EMBER : '#fff', color: on ? '#fff' : INK, boxShadow: on ? '0 0 0 5px rgba(208,122,85,.2), 0 0 0 12px rgba(208,122,85,.08)' : '0 0 0 1px rgba(43,50,71,.18), 0 6px 14px rgba(43,50,71,.08)', transition: 'box-shadow .2s, background-color .2s' }}>
        {phase === 'busy'
          ? <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" fill="none" strokeDasharray="14 30" strokeLinecap="round"><animateTransform attributeName="transform" type="rotate" from="0 10 10" to="360 10 10" dur=".8s" repeatCount="indefinite" /></circle></svg>
          : on ? <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="2" y="2" width="12" height="12" rx="3" fill="currentColor" /></svg>
          : <svg width="20" height="22" viewBox="0 0 20 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><rect x="6.5" y="1.5" width="7" height="11" rx="3.5" /><path d="M3 10.5a7 7 0 0 0 14 0M10 17.5v3" /></svg>}
      </button>
      <style>{'@keyframes omk-rec{0%,100%{opacity:1}50%{opacity:.3}}'}</style>
      {err && <span role="alert" style={{ position: 'absolute', bottom: size + 8, right: 0, width: 190, fontSize: 11.5, lineHeight: 1.35, textAlign: 'right', color: EMBER, background: 'rgba(255,255,255,.95)', padding: '6px 9px', borderRadius: 10, boxShadow: '0 4px 14px rgba(43,50,71,.12)' }}>{err}</span>}
    </span>
  );
};
