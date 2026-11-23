// Vercel serverless function: hold-to-talk dictation. Receives a short audio clip, sends it to
// Groq's Whisper with the server-side GROQ_API_KEY (never exposed to the browser), returns the text.
const MODEL = process.env.GROQ_STT_MODEL || 'whisper-large-v3-turbo';
const LANGUAGE = process.env.GROQ_STT_LANGUAGE || 'en';   // set to "auto" to let Whisper detect the language
const MAX_BYTES = 4 * 1024 * 1024;                         // Vercel's request limit is 4.5 MB

async function signedIn(token: string): Promise<boolean> {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !token) return false;
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
  return r.ok;
}

async function readBody(req: any): Promise<Buffer> {
  const chunks: Buffer[] = []; let n = 0;
  for await (const c of req) {
    const b = Buffer.isBuffer(c) ? c : Buffer.from(c);
    n += b.length; if (n > MAX_BYTES) throw new Error('too-big');
    chunks.push(b);
  }
  return Buffer.concat(chunks);
}

const ext = (type: string) => (/mp4|m4a|aac/.test(type) ? 'mp4' : /ogg/.test(type) ? 'ogg' : /wav/.test(type) ? 'wav' : /mpeg|mp3/.test(type) ? 'mp3' : 'webm');

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return res.status(501).json({ error: 'GROQ_API_KEY is not set on the server.' });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!(await signedIn(token))) return res.status(401).json({ error: 'Sign in first.' });

  let audio: Buffer;
  try { audio = await readBody(req); } catch { return res.status(413).json({ error: 'That recording is too long.' }); }
  if (audio.length < 800) return res.status(400).json({ error: 'No audio received.' });

  const type = String(req.headers['content-type'] || 'audio/webm').split(';')[0];
  const form = new FormData();
  form.append('file', new Blob([audio], { type }), `clip.${ext(type)}`);
  form.append('model', MODEL);
  form.append('response_format', 'json');
  form.append('temperature', '0');
  if (LANGUAGE !== 'auto') form.append('language', LANGUAGE);

  try {
    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST', headers: { Authorization: `Bearer ${apiKey}` }, body: form, signal: AbortSignal.timeout(40000),
    });
    if (!r.ok) {
      const j: any = await r.json().catch(() => ({}));
      const msg = r.status === 429 ? 'Too many recordings at once. Try again in a few seconds.' : (j?.error?.message || `Transcription failed (${r.status}).`);
      return res.status(r.status === 429 ? 429 : 502).json({ error: msg });
    }
    const j: any = await r.json();
    return res.status(200).json({ text: String(j?.text || '').trim() });
  } catch (e: any) {
    return res.status(504).json({ error: e?.name === 'TimeoutError' ? 'Transcription timed out.' : 'Could not reach the transcription service.' });
  }
}
