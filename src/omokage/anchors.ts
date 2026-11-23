// The anchor panel: life-narrative questions whose wording is frozen so answers stay comparable across years.
// Each has a cadence tier (Q = quarterly, H = twice a year, Y = yearly look-back). A question's id is the slug of its text,
// exactly like the regular bank, so a reworded question counts as a new one.
export type Tier = 'Q' | 'H' | 'Y';
export interface Anchor { id: string; text: string; theme: string; tier: Tier }
const slug = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48);

const A: [string, Tier, string[]][] = [
  ['Right now', 'Q', [
    'What does a good day look like for you at this stage?',
    'What has been taking up most of your mind lately?',
    'What are you proud of that nobody has noticed?',
    'What do you wish people understood about where you are right now?',
  ]],
  ['Right now', 'Y', ['How would you describe your life right now to someone who hasn’t seen you in five years?']],
  ['Work and purpose', 'H', [
    'What are you building or working toward right now, and why does it matter to you?',
    'What does enough look like for you, in work or money?',
    'Whose approval are you still chasing?',
  ]],
  ['Work and purpose', 'Q', [
    'What part of your work feels most like you?',
    'What are you avoiding that you know you should face?',
  ]],
  ['People', 'Q', [
    'Who matters most to you right now, and how are you showing it?',
    'Who do you go to when things are hard?',
  ]],
  ['People', 'H', [
    'Who are you drifting from, and does it matter to you?',
    'What role do you play in your family right now?',
  ]],
  ['People', 'Y', ['What do you want the people close to you to remember about you?']],
  ['Self and body', 'Q', [
    'How are you treating your body lately, honestly?',
    'What do you do to recover, and is it working?',
    'What does your mind do when you are under pressure?',
    'What are you carrying that you haven’t set down?',
  ]],
  ['Self and body', 'H', ['What are you most afraid of right now?']],
  ['Meaning, happiness and values', 'Y', [
    'What gives your life purpose right now, and does it feel like enough?',
    'What do you believe now that you didn’t believe five years ago?',
    'What would you regret not doing?',
  ]],
  ['Meaning, happiness and values', 'H', [
    'What would make you genuinely happy at this stage, not just relieved?',
    'Is there a gap or emptiness you’re trying to fill right now, and what do you reach for to fill it?',
    'Which of your values did you live up to lately, and which did you let slip?',
    'Where do you feel most like yourself?',
  ]],
  ['Meaning, happiness and values', 'Q', [
    'When did you last feel truly happy, and what was going on?',
    'What are you grateful for that you rarely say out loud?',
  ]],
  ['Change and ahead', 'Y', [
    'What has changed most in you this past year?',
    'What would you tell yourself a year ago?',
    'What do you hope is true of your life in five years?',
  ]],
  ['Change and ahead', 'H', [
    'Where do you feel stuck?',
    'What do you want to be different about how you spend your time?',
  ]],
];
export const ANCHORS: Anchor[] = A.flatMap(([theme, tier, list]) => list.map(text => ({ id: slug(text), text, theme, tier })));
export const ANCHOR_BY_ID = new Map(ANCHORS.map(a => [a.id, a]));
