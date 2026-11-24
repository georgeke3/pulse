// Capsules: the Future tab is a tree. A capsule is an item (kind 'future', meta.capsule = true, name in `title`).
// Every artifact (and capsule) lives in a parent capsule, stored in the existing `board` column:
//   ROOT  ('__root')  the Future tab itself, never deleted
//   INBOX ('Inbox' or null) where shares land, shown as a permanent capsule inside the root
//   TRASH ('__trash') deleted things, kept 30 days
//   any other value = the id of a capsule item
// Layout per artifact lives in meta: size (a snap size), ord (manual order). Nothing else changes in the schema.
import { useEffect } from 'react';
import type { Item } from './items';

export const ROOT = '__root', INBOX = 'Inbox', TRASH = '__trash';
export const isCapsule = (i: Item) => i.meta?.capsule === true;
/** The parent capsule of an item (Inbox for anything without one). */
export const parentOf = (i: Item) => (i.board == null || i.board === '' ? INBOX : i.board);
export const nameOf = (id: string, byId: Map<string, Item>) => id === ROOT ? 'Future' : id === INBOX ? 'Inbox' : id === TRASH ? 'Trash' : (byId.get(id)?.title || 'Untitled');

/** Manual order when set, otherwise newest first (new things land at the top). One scale, so a reorder can slot between. */
export const sortKey = (i: Item) => (typeof i.meta?.ord === 'number' ? (i.meta.ord as number) : -Date.parse(i.at) / 1000);
export const ordered = (list: Item[], newestFirst = false) => [...list].sort((a, b) => newestFirst ? b.at.localeCompare(a.at) : sortKey(a) - sortKey(b));

/** Ids of a capsule and everything nested under it. */
export const descendants = (id: string, items: Item[]): Set<string> => {
  const out = new Set<string>([id]); let grew = true;
  while (grew) { grew = false; for (const i of items) if (!out.has(i.id) && out.has(parentOf(i))) { out.add(i.id); grew = true; } }
  return out;
};
/** Root-first chain of capsule ids ending at `id`. */
export const pathTo = (id: string, byId: Map<string, Item>): string[] => {
  const p: string[] = []; let cur: string | undefined = id, guard = 0;
  while (cur && cur !== ROOT && guard++ < 40) { p.unshift(cur); cur = cur === INBOX ? ROOT : byId.has(cur) ? parentOf(byId.get(cur)!) : ROOT; }
  return [ROOT, ...p];
};

/** Same name, same id on every device, so two phones migrating the same old board never make two capsules. */
export const capsuleIdFor = (name: string) => {
  const h = (seed: number) => { let x = seed; for (const ch of 'capsule:' + name.trim().toLowerCase()) { x ^= ch.charCodeAt(0); x = Math.imul(x, 16777619) >>> 0; } return x.toString(16).padStart(8, '0'); };
  const a = h(2166136261), b = h(0x9e3779b9), c = h(0x85ebca6b), d = h(0xc2b2ae35);
  return `${a}-${b.slice(0, 4)}-4${b.slice(5, 8)}-a${c.slice(1, 4)}-${c.slice(4)}${d}`;
};

const RESERVED = new Set([ROOT, INBOX, TRASH, '']);
/**
 * Older pins name their board instead of pointing at a capsule (old boards, or the iOS Shortcut sending `board: "Recipes"`).
 * Turn each such name into a capsule in the root and point its items at it. Idempotent; runs whenever items change.
 */
export const useCapsuleMigration = (items: Item[], put: (i: Item) => void, update: (id: string, patch: Partial<Item>) => void) => {
  useEffect(() => {
    const fut = items.filter(i => i.kind === 'future');
    const byId = new Map(fut.map(i => [i.id, i]));
    let extra: string[] = []; try { extra = JSON.parse(localStorage.getItem('omokage_boards') || '[]'); } catch { /* none */ }
    const names = new Set<string>(extra.filter(n => typeof n === 'string' && n.trim() && !RESERVED.has(n)));
    for (const i of fut) { const b = i.board; if (b && !RESERVED.has(b) && !byId.has(b)) names.add(b); }
    if (!names.size) return;
    const byName = new Map(fut.filter(isCapsule).map(c => [String(c.title ?? '').trim().toLowerCase(), c.id]));
    for (const n of names) {
      const key = n.trim().toLowerCase();
      let id = byName.get(key);
      if (!id) { id = capsuleIdFor(n); if (!byId.has(id)) put({ id, kind: 'future', day: new Date().toISOString().slice(0, 10), at: new Date().toISOString(), board: ROOT, title: n.trim(), body: '', meta: { capsule: true } }); byName.set(key, id); }
      for (const i of fut) if (i.board === n) update(i.id, { board: id });
      for (const i of fut) if (i.board === TRASH && i.meta?.trashedFrom === n) update(i.id, { meta: { ...(i.meta ?? {}), trashedFrom: id } });
    }
    try { localStorage.removeItem('omokage_boards'); } catch { /* ignore */ }
  }, [items]); // eslint-disable-line react-hooks/exhaustive-deps
};
