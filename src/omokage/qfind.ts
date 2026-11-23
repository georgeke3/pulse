// Finding a question: by the words in it, or by how you feel. "numb", "off", "wired" aren't in any question, so a small
// lexicon maps a feeling to the things its questions are about (and to the bank themes that tend to hold them).
// If that comes up thin, Gemini can pick from the bank. It is sent only your phrase and the bank, never your entries.
import { generateText } from '../gemini';
import { ALLQ, type Q } from './qa';

/** [words that name the feeling, stems that appear in fitting questions, themes that lean toward it] */
const FEELS: [string[], string[], string[]][] = [
  [['numb', 'flat', 'empty', 'blank', 'hollow', 'nothing', 'detached', 'disconnected', 'void', 'zombie'], ['feel', 'alive', 'mechan', 'miss', 'emptiness', 'gap', 'real', 'moment', 'time disappear', 'look forward', 'yourself', 'surpris', 'laugh', 'pretend'], ['Self', 'Hard feelings']],
  [['depress', 'low', 'down', 'sad', 'heavy', 'hopeless', 'blue', 'grief', 'cry', 'crying', 'miserable'], ['heavy', 'carry', 'drain', 'forgive', 'miss', 'need', 'comfort', 'grateful', 'kind', 'ask', 'light', 'easier', 'support', 'carried you'], ['Hard feelings', 'Self', 'Gratitude']],
  [['off', 'weird', 'unsettled', 'strange', 'uneasy', 'unsure', 'confused', 'lost', 'foggy', 'meh'], ['pretend', 'need', 'afraid', 'story', 'unsaid', 'real', 'tension', 'hold', 'yourself', 'noticing', 'stuck', 'feel'], ['Self', 'Hard feelings']],
  [['anx', 'worr', 'nervous', 'afraid', 'scared', 'fear', 'panic', 'dread', 'tense', 'stress', 'pressure', 'wired', 'jittery'], ['afraid', 'fear', 'worry', 'real', 'tension', 'pressure', 'level', 'boil', 'rush', 'control', 'story', 'happen'], ['Hard feelings', 'Body', 'Time & agency']],
  [['angry', 'anger', 'mad', 'irritat', 'annoy', 'resent', 'frustrat', 'rage', 'furious', 'bitter', 'snap'], ['angry', 'resent', 'boil', 'unsaid', 'swallow', 'hold', 'tightly', 'forgive', 'level', 'tension', 'forcing'], ['Hard feelings', 'Partnership', 'Newborn season']],
  [['tired', 'exhaust', 'drained', 'burnt', 'burn', 'overwhelm', 'fried', 'wiped', 'spent', 'depleted', 'sleepy'], ['drain', 'energy', 'sleep', 'recover', 'rest', 'slow', 'grind', 'tension', 'cost', 'backlog', 'ask', 'help', 'forcing'], ['Body', 'Newborn season', 'Time & agency']],
  [['lonely', 'alone', 'isolated', 'ignored', 'invisible', 'unseen', 'homesick'], ['miss', 'who', 'someone', 'message', 'friend', 'show up', 'drifting', 'go to', 'close', 'need'], ['People', 'Partnership']],
  [['stuck', 'bored', 'restless', 'stagnant', 'unmotivated', 'lazy', 'procrastinat', 'avoid', 'rut'], ['stuck', 'avoid', 'mechan', 'alive', 'look forward', 'would you try', 'braver', 'change', 'backlog', 'habit'], ['Growth', 'Drive', 'Ahead']],
  [['guilty', 'guilt', 'ashamed', 'shame', 'regret', 'embarrass', 'failure', 'inadequate'], ['forgive', 'regret', 'easy on yourself', 'honest', 'wrong', 'afraid', 'proud', 'approval', 'right call'], ['Hard feelings', 'Self']],
  [['happy', 'good', 'great', 'joy', 'proud', 'content', 'excited', 'grateful', 'thankful', 'peace', 'calm', 'light'], ['proud', 'laugh', 'grateful', 'worth it', 'best', 'remember', 'easier', 'looking forward', 'goes right', 'comfort', 'alive'], ['Gratitude', 'Noticing', 'Ahead']],
  [['proud', 'accomplish', 'productive', 'progress', 'motivated', 'focused'], ['proud', 'progress', 'make', 'build', 'learn', 'better'], ['Drive', 'Work', 'Growth']],
];
const stem = (w: string) => w.toLowerCase().replace(/[^a-z ]/g, '');
const words = (s: string) => stem(s).split(/\s+/).filter(w => w.length > 2);

/** Questions that fit a typed phrase, best first. Empty when nothing matches. */
export const findQuestions = (query: string, pool: Q[] = ALLQ): Q[] => {
  const qw = words(query); if (!qw.length) return [];
  const lex = FEELS.filter(([names]) => qw.some(w => names.some(n => w.startsWith(n) || n.startsWith(w))));
  const scored = pool.map(q => {
    const t = stem(q.text); let s = 0;
    for (const w of qw) if (t.split(/\s+/).some(x => x.startsWith(w))) s += 3;
    for (const [, stems, themes] of lex) { for (const st of stems) if (t.includes(st)) s += 2; if (themes.includes(q.theme)) s += 1.5; }
    return { q, s };
  }).filter(x => x.s > 0);
  return scored.sort((a, b) => b.s - a.s).map(x => x.q).slice(0, 24);
};

/** Ask Gemini to choose up to six questions for a feeling. Only the phrase and the question bank leave the device. */
export const pickWithGemini = async (query: string, localKey?: string): Promise<Q[]> => {
  const list = ALLQ.map(q => `${q.id} | ${q.text}`).join('\n');
  const prompt = `Someone writing in a private journal describes how they feel right now: "${query.slice(0, 120)}".
From the list below, choose up to 6 reflective questions that would help them most in that state. Prefer gentle, honest questions over clinical ones, and a mix of ways in.
Reply with ONLY a JSON array of the chosen ids, nothing else.

${list}`;
  const text = await generateText(prompt, localKey);
  const m = text.match(/\[[\s\S]*?\]/); if (!m) throw new Error('Gemini gave no list.');
  const ids: unknown = JSON.parse(m[0]); if (!Array.isArray(ids)) throw new Error('Gemini gave no list.');
  const byId = new Map(ALLQ.map(q => [q.id, q]));
  return ids.map(i => byId.get(String(i).trim())).filter((q): q is Q => !!q).slice(0, 6);
};
