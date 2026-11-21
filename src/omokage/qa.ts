// The Past tab's question bank and topics. Questions are short, concrete and answerable in a few lines at night;
// each has a stable id so answers can be filtered by question even if the wording is polished later.
import { useMemo } from 'react';
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
];
const slug = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);
export const BANK: Q[] = B.flatMap(([theme, list]) => list.map(text => ({ id: slug(text), theme, text })));
export const THEMES = B.map(([t]) => t);
const dayNo = (d: string) => Math.round(Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8)) / 864e5);
/** Tonight's question: walks the whole bank in a fixed shuffled order, one a day, so nothing repeats for ~2 months. */
export const questionFor = (day: string): Q => BANK[(dayNo(day) * 37) % BANK.length];
export const qid = (text: string) => BANK.find(q => q.text === text)?.id ?? slug(text);

export const TOPICS: [string, string[]][] = [
  ['People', ['Mila', 'Kat', 'family', 'parents', 'siblings', 'friends', 'colleagues', 'community', 'strangers']],
  ['Body', ['sleep', 'gym', 'food', 'health', 'energy', 'outdoors', 'rest', 'pain']],
  ['Mind', ['mood', 'anxiety', 'focus', 'calm', 'stress', 'boredom', 'motivation', 'confidence', 'loneliness']],
  ['Work', ['work', 'career', 'projects', 'meetings', 'money', 'learning', 'side project', 'ideas']],
  ['Life', ['home', 'parenting', 'marriage', 'chores', 'travel', 'plans', 'routines', 'weekend']],
  ['Heart', ['gratitude', 'joy', 'pride', 'regret', 'hope', 'fear', 'love', 'grief', 'faith']],
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
