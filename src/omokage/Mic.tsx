import { useEffect, useRef, useState } from 'react';
import { cloud, cloudConfigured } from '../cloudClient';
import { haptic } from './haptics';
import { EMBER, INK, INK2 } from './skins';

type Phase = 'idle' | 'rec' | 'busy';

const pickType = () => {
  const ok = (t: string) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t);
  return ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(ok) ?? '';
};

/** One stream shared by every mic, kept warm for a few seconds so the next press starts instantly (and iOS does not re-ask). */
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

/** Hold to talk. Text lands through onText when you let go. */
export const Mic = ({ onText, size = 52, label }: { onText: (t: string) => void; size?: number; label?: string }) => {
  const [phase, setPhase] = useState<Phase>('idle');
  const [err, setErr] = useState('');
  const rec = useRef<MediaRecorder | null>(null), chunks = useRef<Blob[]>([]), t0 = useRef(0), want = useRef(false), live = useRef(true);
  useEffect(() => () => { live.current = false; try { rec.current?.state === 'recording' && rec.current.stop(); } catch { /* ignore */ } cool(); }, []);
  useEffect(() => { if (!err) return; const t = setTimeout(() => setErr(''), 3600); return () => clearTimeout(t); }, [err]);

  const down = async (e: React.PointerEvent<HTMLButtonElement>) => {
    e.preventDefault(); e.stopPropagation();
    if (phase !== 'idle') return;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ }
    want.current = true; setErr(''); haptic(10); setPhase('rec');
    try {
      const stream = await getStream();
      if (!want.current) { setPhase('idle'); cool(); return; }      // let go before the mic was ready
      const type = pickType(), r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = []; t0.current = Date.now();
      r.ondataavailable = ev => { if (ev.data.size) chunks.current.push(ev.data); };
      r.onstop = async () => {
        cool();
        const blob = new Blob(chunks.current, { type: r.mimeType || type || 'audio/mp4' });
        if (Date.now() - t0.current < 450 || blob.size < 800) { live.current && setPhase('idle'); return; }
        live.current && setPhase('busy');
        try { const t = await transcribe(blob); if (live.current) { setPhase('idle'); t && onText(t); haptic(8); } }
        catch (x) { if (live.current) { setPhase('idle'); setErr((x as Error).message); } }
      };
      rec.current = r; r.start();
    } catch {
      want.current = false; setPhase('idle'); setErr('Allow the microphone to dictate.');
    }
  };
  const up = () => {
    want.current = false;
    const r = rec.current;
    if (r && r.state === 'recording') { haptic(6); r.stop(); } else if (phase === 'rec') setPhase('idle');
  };

  const on = phase === 'rec';
  return (
    <span style={{ position: 'relative', display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
      <button type="button" className="press" aria-label="Hold to talk" onPointerDown={down} onPointerUp={up} onPointerCancel={up} onContextMenu={e => e.preventDefault()} onMouseDown={e => e.preventDefault()}
        style={{ width: size, height: size, borderRadius: size / 2, display: 'grid', placeItems: 'center', touchAction: 'none', WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none',
          background: on ? EMBER : '#fff', color: on ? '#fff' : INK, boxShadow: on ? `0 0 0 6px rgba(197,90,58,.18), 0 0 0 14px rgba(197,90,58,.08)` : '0 0 0 1px rgba(43,50,71,.18), 0 6px 14px rgba(43,50,71,.08)', transition: 'box-shadow .2s, background-color .2s', transform: on ? 'scale(1.08)' : undefined }}>
        {phase === 'busy'
          ? <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="7" stroke="currentColor" strokeWidth="1.6" fill="none" strokeDasharray="14 30" strokeLinecap="round"><animateTransform attributeName="transform" type="rotate" from="0 10 10" to="360 10 10" dur=".8s" repeatCount="indefinite" /></circle></svg>
          : <svg width="20" height="22" viewBox="0 0 20 22" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" aria-hidden="true"><rect x="6.5" y="1.5" width="7" height="11" rx="3.5" /><path d="M3 10.5a7 7 0 0 0 14 0M10 17.5v3" /></svg>}
      </button>
      {label !== undefined && <span style={{ fontSize: 10.5, color: INK2, whiteSpace: 'nowrap' }}>{phase === 'rec' ? 'listening…' : phase === 'busy' ? 'writing…' : label}</span>}
      {err && <span role="alert" style={{ position: 'absolute', bottom: size + 8, right: 0, width: 190, fontSize: 11.5, lineHeight: 1.35, textAlign: 'right', color: EMBER, background: 'rgba(255,255,255,.95)', padding: '6px 9px', borderRadius: 10, boxShadow: '0 4px 14px rgba(43,50,71,.12)' }}>{err}</span>}
    </span>
  );
};
