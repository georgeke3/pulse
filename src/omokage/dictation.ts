// Dictation core, kept outside React so a recording can never be lost to a re-render, a closed sheet, a reload or a failed upload.
//  - audio is written to IndexedDB every second WHILE recording (a crash or reload leaves a recoverable job)
//  - transcription retries on network hiccups; on a hard failure the audio stays as a job you can retry
//  - a finished transcript stays as a job until the text is actually handed to a text box
//  - flush() lets Save stop a live recording and take its text in one go (nothing is dropped by pressing Save mid-recording)
import { useSyncExternalStore } from 'react';
import { cloud, cloudConfigured } from '../cloudClient';
import { haptic } from './haptics';

export const MAX_SECS = 300;          // 5 min
const MAX_BYTES = 3_600_000;          // Vercel's upload limit is 4.5 MB; stop a little before it
const KEEP_MS = 14 * 864e5;
const DB = 'omokage-dictation', JOBS = 'jobs', PARTS = 'parts';

export interface Job { id: string; type: string; at: number; state: 'rec' | 'wait' | 'done'; text?: string }
type Phase = 'idle' | 'rec' | 'busy';
interface State { phase: Phase; owner: string | null; secs: number; err: string; errOwner: string | null; pending: Job[] }

/* ---------- IndexedDB ---------- */
const db = (): Promise<IDBDatabase> => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => { r.result.createObjectStore(JOBS, { keyPath: 'id' }); r.result.createObjectStore(PARTS, { keyPath: 'key' }); };
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
const run = async <T,>(store: string, mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const d = await db();
  return new Promise((res, rej) => { const q = f(d.transaction(store, mode).objectStore(store)); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
};
const safe = <T,>(p: Promise<T>) => p.catch(() => undefined);      // storage trouble must never break recording itself
const putJob = (j: Job) => safe(run(JOBS, 'readwrite', s => s.put(j)));
const putPart = (id: string, n: number, blob: Blob) => safe(run(PARTS, 'readwrite', s => s.put({ key: `${id}/${String(n).padStart(6, '0')}`, id, blob })));
const partsOf = async (id: string): Promise<Blob[]> => {
  try { return (await run<{ key: string; blob: Blob }[]>(PARTS, 'readonly', s => s.getAll(IDBKeyRange.bound(`${id}/`, `${id}/￿`)))).map(p => p.blob); } catch { return []; }
};
const dropJob = async (id: string) => {
  await safe(run(JOBS, 'readwrite', s => s.delete(id)));
  await safe(run(PARTS, 'readwrite', s => s.delete(IDBKeyRange.bound(`${id}/`, `${id}/￿`))));
};

/* ---------- shared state ---------- */
let S: State = { phase: 'idle', owner: null, secs: 0, err: '', errOwner: null, pending: [] };
const subs = new Set<() => void>();
const set = (p: Partial<State>) => { S = { ...S, ...p }; subs.forEach(f => f()); };
export const useDictation = () => useSyncExternalStore(f => { subs.add(f); return () => { subs.delete(f); }; }, () => S);

interface Cur { job: Job; rec: MediaRecorder; t0: number; bytes: number; n: number; writes: Promise<unknown>[]; parts: Blob[]; tick?: ReturnType<typeof setInterval>; done: Promise<string>; resolve: (t: string) => void; reject: (e: Error) => void; lock?: { release: () => Promise<void> } | null; finishing: boolean }
let cur: Cur | null = null;
const claimed = new Set<string>();

const refresh = async () => {
  let all: Job[] = [];
  try { all = await run<Job[]>(JOBS, 'readonly', s => s.getAll()); } catch { /* no storage */ }
  const keep: Job[] = [];
  for (const j of all) {
    if (Date.now() - j.at > KEEP_MS) { void dropJob(j.id); continue; }
    if (cur && cur.job.id === j.id) continue;
    if (claimed.has(j.id)) continue;
    keep.push(j.state === 'rec' ? { ...j, state: 'wait' } : j);       // a job still marked "rec" at boot was cut off: its saved audio is what we have
  }
  set({ pending: keep.sort((a, b) => a.at - b.at) });
};
if (typeof indexedDB !== 'undefined') void refresh();

/* ---------- mic stream (kept warm briefly so the next tap starts instantly and iOS does not re-ask) ---------- */
let warm: MediaStream | null = null, warmTimer: ReturnType<typeof setTimeout> | undefined;
const getStream = async () => {
  clearTimeout(warmTimer);
  if (warm && warm.getAudioTracks().some(t => t.readyState === 'live')) return warm;
  warm = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
  return warm;
};
const cool = () => { clearTimeout(warmTimer); warmTimer = setTimeout(() => { warm?.getTracks().forEach(t => t.stop()); warm = null; }, 12000); };
const pickType = () => {
  const ok = (t: string) => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(t);
  return ['audio/mp4', 'audio/webm;codecs=opus', 'audio/webm'].find(ok) ?? '';
};

/* ---------- transcription ---------- */
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
class Hard extends Error {}
async function transcribeOnce(blob: Blob): Promise<string> {
  const token = cloudConfigured ? cloud?.getSession()?.access_token : undefined;
  if (!token) throw new Hard('Sign in to use the mic.');
  const r = await fetch('/api/transcribe', { method: 'POST', headers: { 'content-type': blob.type || 'audio/mp4', Authorization: `Bearer ${token}` }, body: blob });
  const j = await r.json().catch(() => ({}));
  if (r.ok) return String(j.text || '');
  const msg = j?.error || `Server error ${r.status}`;
  if (r.status === 429 || r.status >= 500) throw new Error(msg);      // worth another try
  throw new Hard(msg);
}
/** Up to 3 tries with a pause between (network drops, rate limits, a busy server). */
export async function transcribe(blob: Blob): Promise<string> {
  let last: Error = new Error('Transcription failed.');
  for (const wait of [0, 1500, 4000]) {
    if (wait) await sleep(wait);
    try { return await transcribeOnce(blob); } catch (e) { last = e as Error; if (e instanceof Hard) break; }
  }
  throw new Error(`${last.message || 'Transcription failed.'} Your recording is kept.`);
}

/* ---------- recording ---------- */
const lockScreen = async (): Promise<Cur['lock']> => { try { return await (navigator as unknown as { wakeLock?: { request: (t: string) => Promise<Cur['lock']> } }).wakeLock?.request('screen') ?? null; } catch { return null; } };

async function finish(c: Cur) {
  if (c.finishing) return; c.finishing = true;
  clearInterval(c.tick); void c.lock?.release().catch(() => undefined); cool();
  set({ phase: 'busy' });
  try {
    await Promise.all(c.writes);
    const blob = new Blob(c.parts, { type: c.rec.mimeType || c.job.type || 'audio/mp4' });
    if (Date.now() - c.t0 < 450 || blob.size < 800) { await dropJob(c.job.id); cur = null; set({ phase: 'idle', owner: null }); c.resolve(''); void refresh(); return; }
    c.job.state = 'wait'; await putJob(c.job);
    const text = (await transcribe(blob)).trim();
    if (!text) { await dropJob(c.job.id); cur = null; set({ phase: 'idle', owner: null }); c.resolve(''); void refresh(); return; }
    c.job.state = 'done'; c.job.text = text; await putJob(c.job);
    cur = null; set({ phase: 'idle', owner: null }); c.resolve(text); void refresh();
  } catch (e) {
    const owner = S.owner; cur = null; claimed.delete(c.job.id);
    set({ phase: 'idle', owner: null, err: (e as Error).message, errOwner: owner }); void refresh(); c.reject(e as Error);
  }
}

/** Begin recording for `owner`. Resolves with the job id and a promise of the transcript (never rejects into the void: errors also land in state.err). */
export async function startDictation(owner: string): Promise<{ id: string; done: Promise<string> } | null> {
  if (cur || S.phase !== 'idle') return null;
  set({ phase: 'rec', owner, secs: 0, err: '', errOwner: null }); haptic(10);
  try {
    const stream = await getStream();
    const type = pickType();
    const rec = new MediaRecorder(stream, { ...(type ? { mimeType: type } : {}), audioBitsPerSecond: 32000 });
    const job: Job = { id: crypto.randomUUID(), type: rec.mimeType || type, at: Date.now(), state: 'rec' };
    let resolve!: (t: string) => void, reject!: (e: Error) => void;
    const done = new Promise<string>((a, b) => { resolve = a; reject = b; });
    done.catch(() => undefined);
    const c: Cur = { job, rec, t0: Date.now(), bytes: 0, n: 0, writes: [], parts: [], done, resolve, reject, finishing: false };
    cur = c; await putJob(job);
    rec.ondataavailable = ev => { if (!ev.data.size) return; c.parts.push(ev.data); c.bytes += ev.data.size; c.writes.push(putPart(job.id, c.n++, ev.data)); };
    rec.onstop = () => void finish(c);
    rec.onerror = () => { try { rec.state !== 'inactive' && rec.stop(); } catch { /* ignore */ } void finish(c); };
    rec.start(1000);
    c.lock = await lockScreen();
    c.tick = setInterval(() => {
      const s = Math.floor((Date.now() - c.t0) / 1000); set({ secs: s });
      if (rec.state === 'inactive') { void finish(c); return; }            // the OS cut the recorder (app backgrounded, call came in)
      if (s >= MAX_SECS || c.bytes >= MAX_BYTES) { set({ err: 'Hit the length limit. Tap the mic to keep going.', errOwner: owner }); stopDictation(); }
    }, 250);
    return { id: job.id, done };
  } catch {
    cur = null; set({ phase: 'idle', owner: null, err: 'Allow the microphone to dictate.', errOwner: owner });
    return null;
  }
}

/** Stop the recording; the transcript is produced in the background. */
export function stopDictation() {
  const c = cur; if (!c) return;
  clearInterval(c.tick); haptic(6);
  try { c.rec.state !== 'inactive' ? c.rec.stop() : void finish(c); } catch { void finish(c); }
}

/** Hand a transcript to a text box exactly once; true means "yours, insert it". The saved job is then removed. */
export async function deliver(id: string): Promise<boolean> {
  if (claimed.has(id)) return false;
  claimed.add(id); await dropJob(id); void refresh(); return true;
}

export const clearDictationError = () => set({ err: '', errOwner: null });
export const dictationActive = () => S.phase !== 'idle';

/** For Save: stops a live recording (or waits for the one being transcribed) and returns its text, claiming it so no one else inserts it too. */
export async function flushDictation(): Promise<string> {
  const c = cur; if (!c) return '';
  if (claimed.has(c.job.id)) return '';
  claimed.add(c.job.id);
  if (c.rec.state === 'recording') stopDictation();
  try { const t = await c.done; await dropJob(c.job.id); void refresh(); return t; }
  catch (e) { claimed.delete(c.job.id); throw e; }
}

/** The owner went away mid-recording (sheet closed): stop; the text waits as a recoverable job. */
export function releaseDictation(owner: string) { if (S.owner === owner && cur && cur.rec.state === 'recording') stopDictation(); }

/** Retry / recover a saved job: transcribes its audio if needed and returns the text (call deliver() once it is inserted). */
export async function recoverJob(j: Job, owner: string): Promise<string> {
  if (S.phase !== 'idle') return '';
  if (j.state === 'done' && j.text) return j.text;
  set({ phase: 'busy', owner, err: '', errOwner: null });
  try {
    const blob = new Blob(await partsOf(j.id), { type: j.type || 'audio/mp4' });
    if (blob.size < 800) { await dropJob(j.id); void refresh(); set({ phase: 'idle', owner: null }); return ''; }
    const text = (await transcribe(blob)).trim();
    if (!text) { await dropJob(j.id); set({ phase: 'idle', owner: null }); void refresh(); return ''; }
    const next: Job = { ...j, state: 'done', text }; await putJob(next);
    set({ phase: 'idle', owner: null }); void refresh(); return text;
  } catch (e) { set({ phase: 'idle', owner: null, err: (e as Error).message, errOwner: owner }); throw e; }
}
