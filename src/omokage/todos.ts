// Home's to-do list. It owns no schedule: it asks a few sources what is open today and sorts the answers into groups.
//  - habits: the three things the app exists for, plus tonight's optional extras (nothing here carries over; a missed day just lapses)
//  - rhythms: anchor questions that are due (they persist until answered, nudged back by "too soon" / "not relevant")
// A future source (manual tasks, say) is one more function that returns items.
import { useApp } from '../store';
import { useItems } from './items';
import { useAnchorStatus, useAnswers } from './qa';
import { isStim } from './special';
import { dayNow, dstr, todayStr, type Mode } from './skins';

export interface Todo { label: string; done: boolean; act: () => void; hint?: string }
type Go = (m: Mode, patch?: Record<string, unknown>) => void;

export const useTodos = (go: Go, onPulse: () => void) => {
  const { state } = useApp();
  const { items } = useItems();
  const answers = useAnswers();
  const { due } = useAnchorStatus();
  const today = todayStr(), td = state.days[today];

  // source: daily habits
  const nq = state.config.daily_questions.length, answered = Object.keys(td?.answers ?? {}).length;
  const inbox = items.filter(i => i.kind === 'future' && (i.board || 'Inbox') === 'Inbox').length;
  const stimN = (td?.events ?? []).filter(e => isStim(e.type)).length;
  const monday = (() => { const d = dayNow(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); return dstr(d); })();
  const qWeek = new Set(answers.filter(a => a.day >= monday && a.day <= today).map(a => a.day)).size;
  const told = !!td?.note?.trim(), ansToday = answers.some(a => a.day === today);
  const critical: Todo[] = [
    { label: answered >= nq ? 'Evening pulse, done' : answered ? `Evening pulse · ${nq - answered} left` : 'Evening pulse', done: answered >= nq, act: () => onPulse() },
    { label: stimN ? `Logged today · ${stimN}` : 'Log at least one stimulus', done: stimN > 0, act: () => go('present') },
    { label: qWeek >= 2 ? `Questions this week · ${qWeek} of 2` : `Answer a question · ${qWeek} of 2 this week`, done: qWeek >= 2, act: () => go('past') },
  ];
  const optional: Todo[] = [
    { label: told ? 'The day, told' : 'Tell the day', done: told, act: () => go('present') },
    ...(inbox ? [{ label: `Sort ${inbox} inbox idea${inbox > 1 ? 's' : ''}`, done: false, act: () => go('future') }] : []),
    ...(!ansToday && qWeek >= 2 ? [{ label: 'Tonight’s question', done: false, act: () => go('past') }] : []),
  ];

  // source: the rhythm engine. Home shows only the most overdue anchor (a tap opens it); the rest wait in Past › More questions › Due.
  const first = due[0];
  const dueItems: Todo[] = first ? [{ label: first.a.text, done: false, hint: due.length > 1 ? `+${due.length - 1} more` : undefined, act: () => go('past', { 'past.w': { q: first.a.text } }) }] : [];

  return { critical, optional, due: dueItems, inbox };
};
