import { cloud, cloudConfigured } from './cloudClient';

const MODELS = ['gemini-3.6-flash', 'gemini-2.5-flash', 'gemini-flash-latest'];
const BASE = 'https://generativelanguage.googleapis.com/v1beta';
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

type Fetch = typeof fetch;

/** Direct call with the user's own key: tries each model, twice around, so one overloaded model does not fail the request. */
export async function directGemini(prompt: string, key: string, fetchFn: Fetch = fetch, models = MODELS): Promise<string> {
  const notes: string[] = [];
  for (let round = 0; round < 2; round++) {
    for (const model of models) {
      try {
        const r = await fetchFn(`${BASE}/models/${model}:generateContent`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': key },
          body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }] }),
        });
        if (!r.ok) {
          notes.push(`${model}: ${r.status}`);
          if ([400, 401, 403].includes(r.status)) throw new Error(`Gemini rejected the request (${r.status}). Check your API key.`);
          continue;
        }
        const j = await r.json();
        const parts: any[] = j?.candidates?.[0]?.content?.parts || [];
        const text = parts.filter((p) => !p.thought).map((p) => p.text || '').join('');
        if (text) return text;
        notes.push(`${model}: empty`);
      } catch (e: any) {
        if (String(e?.message).startsWith('Gemini rejected')) throw e;
        notes.push(`${model}: network`);
      }
    }
    if (round === 0) await sleep(1500);
  }
  throw new Error('Gemini is overloaded right now. Try again in a minute. (' + notes.join(', ') + ')');
}

/** Prefers the server-side key (signed in); falls back to the key saved in Settings. */
export async function generateText(prompt: string, localKey?: string): Promise<string> {
  const token = cloudConfigured ? cloud?.getSession()?.access_token : undefined;
  let serverError = '';
  if (token) {
    try {
      const r = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ prompt }),
      });
      if (r.ok) return (await r.json()).text as string;
      const j = await r.json().catch(() => ({}));
      serverError = (j?.error || `Server error ${r.status}`) + (Array.isArray(j?.notes) && j.notes.length ? ` [${j.notes.join(', ')}]` : '');
      if (j?.why) console.warn('gemini 429 detail', j.why);
    } catch {
      serverError = 'Could not reach the server.';
    }
  }
  if (localKey) return directGemini(prompt, localKey);
  throw new Error(serverError || 'No Gemini key. Add one in Settings.');
}
