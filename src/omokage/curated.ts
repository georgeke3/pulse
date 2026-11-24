// The curated question: once a day Gemini reads your last week (day notes, event notes, answers, how loaded and rested you were,
// yesterday weighted most) and writes one question that follows a thread from it. Cached per day so it stays put.
// Offline, signed out, or with nothing written recently, nothing is shown and the regular question carries the slot.
import { useCallback, useEffect, useRef, useState } from 'react';
import { useApp } from '../store';
import { generateText } from '../gemini';
import { sideTotal } from './load';
import { isText } from './special';
import { useAnswers, type Answer } from './qa';
import { dstr, fromDstr } from './skins';
import type { AppState } from '../types';

const KEY = (d: string) => `omk_curated_${d}`;
export const readCurated = (d: string): string | null => { try { return (JSON.parse(localStorage.getItem(KEY(d)) || 'null') as { text: string } | null)?.text ?? null; } catch { return null; } };
const writeCurated = (d: string, text: string) => { try { localStorage.setItem(KEY(d), JSON.stringify({ text, at: new Date().toISOString() })); } catch { /* private mode */ } };

const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);
const back = (d: string, n: number) => { const t = fromDstr(d); t.setDate(t.getDate() - n); return dstr(t); };

/** What the last seven days looked like, as plain text for the prompt. Returns '' when there is nothing written to go on. */
export const buildDigest = (days: AppState['days'], answers: Answer[], today: string): string => {
  const out: string[] = []; let words = 0;
  for (let n = 0; n < 7; n++) {
    const d = back(today, n), day = days[d], ev = day?.events ?? [], ans = answers.filter(a => a.day === d);
    const note = day?.note?.trim() ?? '';
    const evNotes = ev.filter(e => e.notes?.trim()).slice(0, 6).map(e => `- ${e.category}${isText(e.type) ? '' : ` (${e.type === 'training' ? 'load' : e.type === 'recovery' ? 'rest' : e.type}, intensity ${Math.round(e.objectiveIntensity)}/10)`}: ${clip(e.notes!.trim(), 220)}`);
    const aLines = ans.slice(0, 3).map(a => `- Q: ${a.question || 'free writing'}\n  A: ${clip(a.body.trim(), 400)}`);
    if (!note && !evNotes.length && !aLines.length && !ev.length) continue;
    const label = n === 0 ? 'TODAY' : n === 1 ? 'YESTERDAY (most important)' : fromDstr(d).toLocaleDateString('en', { weekday: 'long' });
    const stats = ev.length ? `load ${sideTotal(ev, 'training')}%, rest ${sideTotal(ev, 'recovery')}%` : 'nothing logged';
    const block = [`## ${label} · ${stats}`, note ? `Day note: ${clip(note, 500)}` : '', ...evNotes, ...aLines].filter(Boolean).join('\n');
    words += block.length; if (words > 7000) break;
    if (note || evNotes.length || aLines.length) out.push(block);
  }
  return out.join('\n\n');
};

const clean = (t: string): string | null => {
  const q = t.split('\n').map(x => x.trim()).find(Boolean)?.replace(/^["“'‘*\-\d.\s]+|["”'’*]+$/g, '').trim();
  return q && q.endsWith('?') && q.length >= 12 && q.length <= 220 ? q : null;
};

export const writeQuestion = async (digest: string, avoid: string[], localKey?: string): Promise<string> => {
  const prompt = `You write one daily journal question for a person, grounded in what they wrote this past week.

Rules:
- Exactly one question, 25 words or fewer, plain and warm, in the second person.
- Follow a thread that keeps coming up, or something left unresolved. Yesterday matters most.
- Be specific to their week, but do not quote their notes back, diagnose, give advice, or compliment.
- No therapy-speak and no stacking two questions in one.
- Do not repeat or closely echo any of these recent questions:
${avoid.slice(0, 30).map(q => `  * ${q}`).join('\n') || '  (none)'}

Reply with only the question.

THEIR LAST WEEK
${digest}`;
  const q = clean(await generateText(prompt, localKey));
  if (!q) throw new Error('Gemini did not return a usable question.');
  return q;
};

/** Tonight's curated question: cached per day, generated once on first look. */
export const useCurated = (day: string, avoid: string[]) => {
  const { state } = useApp();
  const answers = useAnswers();
  const [text, setText] = useState<string | null>(() => readCurated(day));
  const [busy, setBusy] = useState(false), [err, setErr] = useState('');
  const running = useRef(false), tried = useRef(false);
  const live = useRef({ days: state.days, answers, avoid, key: state.geminiKey }); live.current = { days: state.days, answers, avoid, key: state.geminiKey };

  const make = useCallback(async (again?: string) => {
    if (running.current) return;
    const { days, answers: ans, avoid: av, key } = live.current;
    const digest = buildDigest(days, ans, day);
    if (!digest) return;
    running.current = true; setBusy(true); setErr('');
    try { const q = await writeQuestion(digest, again ? [again, ...av] : av, key); writeCurated(day, q); setText(q); }
    catch (e) { const m = e instanceof Error ? e.message : ''; console.error('curated question', e); if (!/No Gemini key|Sign in/i.test(m)) setErr(m ? `Could not write one: ${m.slice(0, 90)}` : 'Could not write one just now.'); }
    finally { running.current = false; setBusy(false); }
  }, [day]);

  useEffect(() => { if (!text && !tried.current) { tried.current = true; void make(); } }, [text, make]);
  return { text, busy, err, retry: () => void make(text ?? undefined) };
};
