import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { cloud, useCloudSession } from '../cloudClient';
import { dropImages, flushUploads, type ImgRef } from './images';
import { todayStr } from './skins';

export const imgsOf = (i: Item): ImgRef[] => (Array.isArray(i.meta?.images) ? (i.meta!.images as ImgRef[]) : []);
export interface Item {
  id: string; kind: 'past' | 'future'; day: string; at: string;
  board?: string | null; title?: string | null; body: string; meta?: Record<string, unknown>;
}
interface Ctx { items: Item[]; add: (i: Omit<Item, 'id' | 'at' | 'day'> & { day?: string }) => void; remove: (id: string) => void; update: (id: string, patch: Partial<Pick<Item, 'board' | 'body' | 'meta'>>) => void }
const C = createContext<Ctx | null>(null);
const KEY = 'omokage_items_v1';
const load = (): Item[] => { try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; } };

export const ItemsProvider = ({ children }: { children: React.ReactNode }) => {
  const [items, setItems] = useState<Item[]>(load);
  const session = useCloudSession();
  const uid = session?.user.id;
  const pending = useRef<Item[]>([]);
  const itemsRef = useRef(items); itemsRef.current = items;

  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(items)); } catch { /* quota */ } }, [items]);

  // pull + push anything local that the server lacks
  useEffect(() => {
    if (!cloud || !uid) return;
    void flushUploads();
    let dead = false;
    const run = async () => {
      try {
        const rows = (await cloud.request('GET', 'omokage_items', { query: { select: '*', order: 'at.desc', limit: '2000' } })) as any[] | null;
        if (dead) return;
        const server = (rows ?? []).map(r => ({ id: r.id, kind: r.kind, day: r.day, at: r.at, board: r.board, title: r.title, body: r.body, meta: r.meta } as Item));
        const ids = new Set(server.map(s => s.id));
        const local = load().filter(l => !ids.has(l.id));
        if (local.length) await cloud.request('POST', 'omokage_items', { query: { on_conflict: 'user_id,id' }, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: local.map(l => ({ ...l, user_id: uid })) });
        if (!dead) setItems([...server, ...local].sort((a, b) => b.at.localeCompare(a.at)));
      } catch (e) { console.error('omokage items sync', e); }
    };
    void run();
    // things saved from outside the app (the iOS Shortcut) show up as soon as the app comes back to the front
    const wake = () => { if (!document.hidden) void run(); };
    document.addEventListener('visibilitychange', wake);
    return () => { dead = true; document.removeEventListener('visibilitychange', wake); };
  }, [uid]);

  const add: Ctx['add'] = useCallback(i => {
    const item: Item = { ...i, id: crypto.randomUUID(), at: new Date().toISOString(), day: i.day ?? todayStr() };
    setItems(p => [item, ...p]);
    if (cloud && uid) {
      cloud.request('POST', 'omokage_items', { query: { on_conflict: 'user_id,id' }, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: [{ ...item, user_id: uid }] })
        .catch(e => { pending.current.push(item); console.error(e); });
    }
  }, [uid]);

  const remove: Ctx['remove'] = useCallback(id => {
    const gone = itemsRef.current.find(x => x.id === id);
    if (gone) void dropImages(imgsOf(gone).map(r => r.id));
    setItems(p => p.filter(x => x.id !== id));
    if (cloud && uid) cloud.request('DELETE', 'omokage_items', { query: { id: `eq.${id}` } }).catch(console.error);
  }, [uid]);

  const update: Ctx['update'] = useCallback((id, patch) => {
    const cur = itemsRef.current.find(x => x.id === id); if (!cur) return;
    const next = { ...cur, ...patch };
    setItems(p => p.map(x => (x.id === id ? next : x)));
    if (cloud && uid) cloud.request('POST', 'omokage_items', { query: { on_conflict: 'user_id,id' }, headers: { Prefer: 'resolution=merge-duplicates,return=minimal' }, body: [{ ...next, user_id: uid }] }).catch(console.error);
  }, [uid]);

  const v = useMemo(() => ({ items, add, remove, update }), [items, add, remove, update]);
  return <C.Provider value={v}>{children}</C.Provider>;
};
export const useItems = () => { const c = useContext(C); if (!c) throw new Error('ItemsProvider missing'); return c; };
