import { useSyncExternalStore } from 'react';
import type { Mode } from './skins';

/**
 * One history for the whole app, like a browser's. Every place you can be (a tab, a page inside it, an open sheet) is an
 * entry holding the exact view state; "back" and "forward" walk that line, so back lands on precisely what you left.
 *  - Opening something pushes an entry. Closing a sheet or page you just opened dismisses it: you land on the entry
 *    underneath and the forward trail is dropped (a closed sheet is not something to "go forward" into).
 *  - The top-left ‹ and the left-edge swipe are the browser-style back (the trail stays, so › can go forward again).
 *  - State that is only a setting of the current place (a calendar month, a selected day) replaces instead of pushing.
 */
type View = Record<string, unknown>;
interface Entry { view: View; via: 'tab' | 'nav'; pushed?: string[] }

const start = (): Mode => { const h = new Date().getHours(); return h >= 20 || h < 4 ? 'home' : 'present'; };
let H: Entry[] = [{ view: { mode: start() }, via: 'tab' }];
let I = 0;
const subs = new Set<() => void>();
const emit = () => subs.forEach(f => f());
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const cur = () => H[I];
export const view = () => cur().view;

/** keys that are an overlay (sheet / modal / viewer) rather than a page */
export const SHEETS = ['app.pulse', 'app.balance', 'app.settings', 'app.dump', 'home.mottos', 'app.mottos', 'past.w', 'future.compose', 'future.view', 'future.editing', 'future.sheet', 'future.move', 'present.draft', 'present.managing', 'present.more', 'present.list', 'present.detail'];
const same = (a: unknown, b: unknown) => { if (a === b || ((a == null || a === false) && (b == null || b === false))) return true; try { return JSON.stringify(a) === JSON.stringify(b); } catch { return false; } };

const push = (view: View, pushed?: string[], via: Entry['via'] = 'nav') => { H = [...H.slice(0, I + 1), { view, via, pushed }]; I = H.length - 1; emit(); };

/** Set one piece of view state. `how`: 'push' makes a new history step; 'replace' edits the current one. Setting a key back to
 *  what it was in the previous step (closing what you opened) steps back and drops the forward trail. */
const set = (key: string, next: unknown, how: 'push' | 'replace', initial: unknown) => {
  const v = cur().view;
  if (same(v[key], next)) return;
  if (I > 0 && cur().pushed?.includes(key) && same(H[I - 1].view[key], next)) { I -= 1; H = H.slice(0, I + 1); emit(); return; }
  // changing something that is already open (a sheet's draft, a page's sub-choice) edits this step instead of stacking steps
  if (how === 'replace' || !same(v[key], initial) && key in v) { H[I] = { ...cur(), view: { ...v, [key]: next } }; emit(); return; }
  push({ ...v, [key]: next }, [key]);
};

export const useNavState = <T,>(key: string, initial: T, how: 'push' | 'replace' = 'push'): [T, (n: T | ((p: T) => T), h?: 'push' | 'replace') => void] => {
  const v = useSyncExternalStore(subscribe, () => cur().view);
  const val = (key in v ? v[key] : initial) as T;
  return [val, (n, h) => { const now = (key in view() ? view()[key] : initial) as T; set(key, typeof n === 'function' ? (n as (p: T) => T)(now) : n, h ?? how, initial); }];
};

const tabKeys = (m: Mode) => Object.keys(view()).filter(k => k.startsWith(m + '.'));
const without = (v: View, ks: string[]) => { const o = { ...v }; for (const k of ks) delete o[k]; return o; };

export const nav = {
  /** a tab-bar tap: fresh at that tab's root; tapping the tab you're on returns it to its root */
  tab: (m: Mode) => {
    const v = view();
    if (v.mode === m) { if (tabKeys(m).length) { H[I] = { ...cur(), view: without(v, tabKeys(m)) }; emit(); } return; }
    push({ ...without(v, tabKeys(m)), mode: m }, undefined, 'tab');
  },
  /** jump to a place in another tab (or deeper in this one) with its state preset; back returns here exactly */
  go: (m: Mode, patch: View = {}) => push({ ...without(view(), tabKeys(m)), mode: m, ...patch }, Object.keys(patch), 'nav'),
  back: () => { if (I > 0) { I -= 1; emit(); } },
  forward: () => { if (I < H.length - 1) { I += 1; emit(); } },
  canBack: () => I > 0,
  canForward: () => I < H.length - 1,
  /** closes whatever was opened last by stepping back and dropping the forward trail */
  dismiss: () => { if (I > 0) { I -= 1; H = H.slice(0, I + 1); emit(); } },
  trail: () => H.map(e => e.view),
  index: () => I,
};

export const sheetOpen = (v: View) => SHEETS.some(k => !!v[k]);

/** Display names for ids held in view state (capsules), filled in by the screens that know them. */
export const navLabels = new Map<string, string>();
const dayName = (d: string) => { const [y, m, dd] = d.split('-').map(Number); const dt = new Date(y, m - 1, dd); return `${dt.toLocaleDateString('en', { weekday: 'long' })} ${dd}`; };
const cap = (s: string) => s[0].toUpperCase() + s.slice(1);
/** a short name for a place, used as the label on ‹ */
export const describe = (v: View): string => {
  if (v['app.pulse']) return 'Pulse';
  if (v['app.settings']) return 'Settings';
  if (v['app.dump']) return 'The day';
  if (v['home.mottos'] || v['app.mottos']) return 'Mottos';
  if (v['past.w']) return 'Answer';
  if (v['future.view']) return 'Photos';
  if (v['future.editing']) return 'Edit';
  if (v['future.sheet']) return 'Artifact';
  if (v['future.move']) return 'Move';
  if (v['future.compose']) return 'New pin';
  if (v['present.draft']) return 'Log';
  if (v['present.detail']) return 'Moment';
  if (v['present.list']) return 'Today';
  if (v['present.managing']) return 'Circles';
  if (v['home.full']) return dayName(String(v['home.full']));
  if (v['home.more']) return 'If you feel like it';
  const m = v.mode as Mode;
  if (m === 'past' && v['past.screen'] === 'questions') return 'Questions';
  if (m === 'past' && v['past.screen'] === 'history') return 'Past answers';
  if (m === 'future' && v['future.allPhotos']) return 'Photos';
  if (m === 'future' && v['future.board']) return navLabels.get(String(v['future.board'])) ?? String(v['future.board']);
  if (m === 'present' && v['present.pday']) return dayName(String(v['present.pday']));
  return cap(m);
};

/** reactive info for the ‹ › controls */
export const useNavInfo = () => {
  useSyncExternalStore(subscribe, () => cur());
  const v = view();
  const prev = I > 0 ? H[I - 1].view : null;
  return {
    mode: v.mode as Mode,
    backLabel: prev ? describe(prev) : '',
    // tab-bar landings are roots: ‹ shows only after you've gone somewhere. Sheets have their own Close.
    /** whether the header makes room for the ‹ › row (kept steady while a sheet is open) */
    row: (I > 0 && cur().via === 'nav') || I < H.length - 1,
    showBack: I > 0 && cur().via === 'nav' && !sheetOpen(v),
    canForward: I < H.length - 1 && !sheetOpen(v),
    forwardLabel: I < H.length - 1 ? describe(H[I + 1].view) : '',
    sheet: sheetOpen(v),
    trailLabels: () => H.slice(0, I + 1).map(e => describe(e.view)),
  };
};
