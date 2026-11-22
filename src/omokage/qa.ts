// The Past tab's question bank and topics. Questions are short, concrete and answerable in a few lines at night;
// each has a stable id so answers can be filtered by question even if the wording is polished later.
import { useMemo, useState } from 'react';
import { useItems, type Item } from './items';

export interface Q { id: string; theme: string; text: string }
const B: [string, string[]][] = [
  ['Noticing', [
    'What is one small thing worth remembering about today?',
    'What made you laugh, even briefly?',
    'What did you see today that you would have missed a year ago?',
    'What moment today would you replay if you could?',
    'What sound, smell or light from today do you want to keep?',
    'When did time disappear today?',
    'What surprised you today?',
    'What was the best ten minutes of your day?',
  ]],
  ['People', [
    'Who showed up for you lately, and how?',
    'Who did you show up for today?',
    'Who do you owe a message to, and what would you say?',
    'What did someone say today that stuck with you?',
    'Who made today easier without knowing it?',
    'Which conversation today mattered more than it looked?',
    'Who do you miss right now?',
    'What do you want the people closest to you to know this week?',
  ]],
  ['Family', [
    'What did Mila do today that you want to remember?',
    'What changed in Mila this week?',
    'What did you and Kat get right together lately?',
    'What kind of parent were you today, honestly?',
    'What do you want Mila to know about this season of your life?',
    'What tradition do you want to start, or keep?',
    'What did your own parents get right that you want to carry on?',
  ]],
  ['Self', [
    'What are you quietly proud of?',
    'What did you hold too tightly today?',
    'Where did you go easy on yourself, and was it right?',
    'What are you pretending not to know?',
    'What drained you today, and what could you change about it?',
    'What did you need today that you didn’t get?',
    'When did you feel most like yourself today?',
    'What were you afraid of today, and was it real?',
    'What story did you tell yourself today that might not be true?',
  ]],
  ['Work', [
    'What did you make or move forward today?',
    'What is the one thing at work you keep avoiding?',
    'What would make tomorrow’s work feel good?',
    'What did you learn the hard way recently?',
    'Where did you do your best thinking today?',
    'What problem is quietly getting bigger?',
    'What would you do differently if you started this project again?',
  ]],
  ['Body', [
    'How did your body feel today, start to finish?',
    'What gave you energy today, and what took it?',
    'How did you sleep, and what affected it?',
    'What did you do today that future-you will thank you for?',
    'Where are you carrying tension right now?',
  ]],
  ['Gratitude', [
    'What are you grateful for that you usually overlook?',
    'What went right today that you almost didn’t notice?',
    'What do you have now that you once hoped for?',
    'What small comfort carried you today?',
    'What is easier now than it used to be?',
  ]],
  ['Growth', [
    'What would you tell yourself a year ago?',
    'What felt heavy this week, and what felt light?',
    'What did you change your mind about recently?',
    'What habit is quietly shaping you, for better or worse?',
    'What are you getting better at without trying?',
    'What lesson do you keep having to relearn?',
    'What would you try if you knew it couldn’t go badly?',
    'What did today teach you?',
  ]],
  ['Ahead', [
    'What are you looking forward to, however small?',
    'What would make this week feel well spent?',
    'What do you want to say no to next week?',
    'What would a slightly braver version of you do tomorrow?',
    'What do you want to remember about this year when it’s over?',
    'What is one thing you want more of next month?',
  ]],
  // Added after reading the day notes and event notes already logged here (Aug–Nov 2026): the themes that kept coming up and had no question yet.
  ['Partnership', [
    'What did you need from Kat today, and did you ask for it?',
    'Where did you say the real thing today, and where did you swallow it?',
    'When did it feel like you were on the same team today?',
    'What tension is building that you could name before it gets loud?',
    'What did Kat carry today that you could take on tomorrow?',
    'What went unsaid between you two today?',
    'What is one thing you could say to Kat that would make this week easier?',
    'Where did you try to head something off instead of just talking about it?',
  ]],
  ['Newborn season', [
    'How much sleep did you really get, and what did it cost you today?',
    'What was the hardest stretch with Mila today, and what got you through it?',
    'What did you do just for yourself today, even for five minutes?',
    'Where did resentment show up today, and what is under it?',
    'Where are you forcing positivity when it is allowed to just be hard?',
    'What small thing made the night easier?',
    'What is one specific thing that would help you recover this week, and who could you ask?',
    'What do you miss from before, and what do you not miss at all?',
    'Which moment with Mila felt completely worth it?',
  ]],
  ['Drive', [
    'What feedback landed today, and what are you doing with it?',
    'Where are you grinding in a way you actually enjoy?',
    'What are you afraid of getting wrong at work, and what would really happen if you did?',
    'Whose approval are you chasing right now, and does it deserve that much of you?',
    'What did you build or make today that was not for anyone else?',
    'What part of today felt mechanical, and what part felt alive?',
    'What is giving you something to look forward to that is not a to-do?',
  ]],
  ['Training', [
    'How do you feel about your training right now, in one honest sentence?',
    'What progress are you making that is easy to miss?',
    'What did you skip, and was it the right call?',
    'What are you missing about training, and what is still yours?',
    'What would a small, kind version of training look like this week?',
  ]],
  ['Time & agency', [
    'Where did you feel like you had no say today?',
    'When did you rush without needing to?',
    'What pulled you out of the moment today?',
    'What did you want to do today that there was no room for?',
    'What is piling up on the backlog that will eventually need you?',
    'What would one slow hour look like tomorrow?',
    'Which visit or obligation took more than you expected, and what did it give back?',
  ]],
  ['Hard feelings', [
    'What did you feel today that you did not say out loud?',
    'When did you get angry today, and what was it really about?',
    'Where did you hand your own worry to someone else today?',
    'What helped you stay level when it was close to boiling over?',
    'What can you forgive yourself for tonight?',
  ]],
];
const slug = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
export const BANK: Q[] = B.flatMap(([theme, list]) => list.map(text => ({ id: slug(text), theme, text })));
export const THEMES = B.map(([t]) => t);
const dayNo = (d: string) => Math.round(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8)) / 864e5);
const OLD_N = B.slice(0, 8).reduce((n, [, l]) => n + l.length, 0);   // the bank before the log-based themes; days up to the cutover keep their original question
/** Tonight's question: walks the bank in a fixed shuffled order, one a day, so nothing repeats for months. */
export const questionFor = (day: string): Q => { const pool = day <= '2026-11-21' ? BANK.slice(0, OLD_N) : BANK; return pool[(dayNo(day) * 37) % pool.length]; };
const OVR = (d: string) => `omk_tonight_${d}`;
interface Over { id: string; skipped: string[] }
const readOver = (d: string): Over | null => { try { return JSON.parse(localStorage.getItem(OVR(d)) || 'null') as Over | null; } catch { return null; } };
/** A random question from `pool`, preferring ones you have never answered. */
export const randomQ = (pool: Q[], seen: Set<string>): Q | undefined => { const fresh = pool.filter(q => !seen.has(q.id)); const from = fresh.length ? fresh : pool; return from[Math.floor(Math.random() * from.length)]; };
/** Tonight's question, with "not applicable": swaps in another one (never a repeat of what you skipped or have answered). */
export const useTonight = (day: string, seen: Set<string>) => {
  const [over, setOver] = useState<Over | null>(() => readOver(day));
  const q = (over && BANK.find(x => x.id === over.id)) || questionFor(day);
  const skip = () => {
    const skipped = [...(over?.skipped ?? []), q.id];
    const n = randomQ(BANK.filter(x => !skipped.includes(x.id)), seen) ?? questionFor(day);
    const o = { id: n.id, skipped }; try { localStorage.setItem(OVR(day), JSON.stringify(o)); } catch { /* private mode */ }
    setOver(o);
  };
  return { q, skip };
};
export const qid = (text: string) => BANK.find(q => q.text === text)?.id ?? slug(text);

export const TOPICS: [string, string[]][] = [
  ['People', ['Mila', 'Kat', 'family', 'parents', 'siblings', 'friends', 'colleagues', 'community', 'strangers']],
  ['Body', ['sleep', 'gym', 'food', 'health', 'energy', 'outdoors', 'rest', 'pain']],
  ['Mind', ['mood', 'anxiety', 'focus', 'calm', 'stress', 'boredom', 'motivation', 'confidence', 'loneliness']],
  ['Work', ['work', 'career', 'projects', 'meetings', 'money', 'learning', 'side project', 'ideas']],
  ['Life', ['home', 'parenting', 'marriage', 'chores', 'travel', 'plans', 'routines', 'weekend']],
  ['Heart', ['gratitude', 'joy', 'pride', 'regret', 'hope', 'fear', 'love', 'grief', 'faith']],
  ['Right now', ['colic', 'sleep debt', 'leave', 'promotion', 'feedback', 'jumping', 'dunking', 'in-laws', 'burnout', 'resentment', 'crash-out', 'building']],
  ['Play', ['music', 'reading', 'games', 'creating', 'nature', 'language', 'food & cooking']],
];
export const ALL_TOPICS = TOPICS.flatMap(([, t]) => t);

export interface Answer { id: string; day: string; at: string; body: string; question: string; qid: string; tags: string[] }
const asAnswer = (i: Item): Answer => {
  const question = String(i.meta?.question ?? '');
  return { id: i.id, day: i.day, at: i.at, body: i.body, question, qid: String(i.meta?.qid ?? qid(question)), tags: (i.meta?.tags as string[]) ?? [] };
};
/** Answers to Past questions, newest first (day summaries live on the day itself, not here). */
export const useAnswers = () => {
  const { items } = useItems();
  return useMemo(() => items.filter(i => i.kind === 'past' && !i.meta?.dump).map(asAnswer).sort((a, b) => b.day.localeCompare(a.day) || b.at.localeCompare(a.at)), [items]);
};
