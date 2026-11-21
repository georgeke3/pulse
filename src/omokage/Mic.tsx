import { useEffect, useRef, useState } from 'react';
import { cloud, cloudConfigured } from '../cloudClient';
import { haptic } from './haptics';
import { EMBER, INK } from './skins';

type Phase = 'idle' | 'rec' | 'busy';

const pickType = () => {
  const ok = (t: string) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t);
  return ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(ok) ?? '';
};

/** One stream shared by every mic, kept warm for a few seconds so the next tap starts instantly (and iOS does not re-ask). */
let warm: MediaStream | null = null, warmTimer: ReturnType<typeof setTimeout> | undefined;
const getStream = async () => {
  clearTimeout(warmTimer);
  if (warm && warm.getAudioTracks().some(t => t.readyState === 'live')) return warm;
  warm = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  return warm;
};
const cool = () => { clearTimeout(warmTimer); warmTimer = setTimeout(() => { warm?.getTracks().forEach(t => t.stop()); warm = null; }, 12000); };

export async function transcribe(blob: Blob): Promise<string> {
  const token = cloudConfigured ? cloud?.getSession()?.access_token : undefined;
  if (!token) throw new Error('Sign in to use the mic.');
  const r = await fetch('/api/transcribe', { method: 'POST', headers: { 'content-type': blob.type || 'audio/mp4', Authorization: `Bearer ${token}` }, body: blob });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j?.error || `Server error ${r.status}`);
  return String(j.text || '');
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** Tap to start, tap again to stop. The text lands through onText a moment later. */
export const Mic = ({ onText, size = 52 }: { onText: (t: string) => void; size?: number }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [secs, setSecs] = useState(0);
  const [err, setErr] = useState('');
  const rec = useRef<MediaRecorder | null>(null), chunks = useRef<Blob[]>([]), t0 = useRef(0), want = useRef(false), live = useRef(true), tick = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  useEffect(() => () => {
    live.current = false; clearInterval(tick.current);
    try { rec.current?.state === 'recording' && rec.current.stop(); } catch { /* ignore */ }
    cool();
  }, []);
  useEffect(() => { if (!err) return; const t = setTimeout(() => setErr(''), 3600); return () => clearTimeout(t); }, [err]);

  const stop = () => {
    want.current = false; clearInterval(tick.current);
    const r = rec.current;
    if (r && r.state === 'recording') { haptic(6); r.stop(); } else setPhase('idle');
  };
  const start = async () => {
    setErr(''); haptic(10); want.current = true; setSecs(0); setPhase('rec');
    try {
      const stream = await getStream();
      if (!want.current) { cool(); return; }                          // tapped stop before the mic was ready
      const type = pickType(), r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      r.ondataavailable = ev => { if (ev.data.size) chunks.current.push(ev.data); };
      r.onstop = async () => {
        cool(); rec.current = null;
        if (!live.current) return;
        const blob = new Blob(chunks.current, { type: r.mimeType || type || 'audio/mp4' });
        if (Date.now() - t0.current < 450 || blob.size < 800) { setPhase('idle'); return; }
        setPhase('busy');
        try { const t = await transcribe(blob); if (live.current) { setPhase('idle'); t && onText(t); haptic(8); } }
        catch (x) { if (live.current) { setPhase('idle'); setErr((x as Error).message); } }
      };
      rec.current = r; t0.current = Date.now(); r.start();
      tick.current = setInterval(() => { const s = Math.floor((Date.now() - t0.current) / 1000); setSecs(s); if (s >= 90) stop(); }, 250);
    } catch {
      want.current = false; setPhase('idle'); setErr('Allow the microphone to dictate.');
    }
  };

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
      <button type="button" className="press" aria-label={on ? 'Stop recording' : 'Dictate'} onClick={() => (on ? stop() : phase === 'idle' ? void start() : undefined)} onMouseDown={e => e.preventDefault()} onContextMenu={e => e.preventDefault()}
        style={{ width: size, height: size, borderRadius: size / 2, display: 'grid', placeItems: 'center', WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
          background: on ? EMBER : '#fff', color: on ? '#fff' : INK, boxShadow: on ? '0 0 0 5px rgba(208,122,85,.2), 0 0 0 12px rgba(208,122,85,.08)' : '0 0 0 1px rgba(43,50,71,.18), 0 6px 14px rgba(43,50,71,.08)', transition: 'box-shadow .2s, background-color .2s' }}>
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
