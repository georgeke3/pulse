// Vercel serverless function: calls Gemini with the server-side GEMINI_API_KEY so the
// key never reaches the browser, and falls through several models when one is overloaded.
const MODELS = (process.env.GEMINI_MODELS || 'gemini-3.6-flash,gemini-2.5-flash,gemini-flash-latest')
  .split(',').map((m: string) => m.trim()).filter(Boolean);
const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function signedIn(token: string): Promise<boolean> {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !token) return false;
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
  return r.ok;
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(501).json({ error: 'GEMINI_API_KEY is not set on the server.' });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!(await signedIn(token))) return res.status(401).json({ error: 'Sign in first.' });

  const prompt = typeof req.body === 'string' ? JSON.parse(req.body || '{}').prompt : req.body?.prompt;
  if (!prompt || typeof prompt !== 'string') return res.status(400).json({ error: 'Missing prompt.' });

  const notes: string[] = [];
  for (let round = 0; round < 2; round++) {
    for (const model of MODELS) {
      try {
        const r = await fetch(`${BASE}/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
          signal: AbortSignal.timeout(25000),
        });
        if (!r.ok) {
          notes.push(`${model}: ${r.status}`);
          if ([400, 401, 403].includes(r.status)) { console.error('gemini rejected', JSON.stringify(notes), (await r.text().catch(() => '')).slice(0, 300)); return res.status(502).json({ error: `Gemini rejected the request (${r.status}).`, notes }); }
          continue; // 404 / 429 / 5xx: try the next model
        }
        const j: any = await r.json();
        const parts = j?.candidates?.[0]?.content?.parts || [];
        const text = parts.filter((p: any) => !p.thought).map((p: any) => p.text || '').join('');
        if (!text) { notes.push(`${model}: empty`); continue; }
        return res.status(200).json({ text, model });
      } catch (e: any) {
        notes.push(`${model}: ${e?.name || 'error'}`);
      }
    }
    if (round === 0) await sleep(1500);
  }
  console.error('gemini failed', JSON.stringify(notes));
  return res.status(503).json({ error: 'Gemini is overloaded right now. Try again in a minute.', notes });
}
