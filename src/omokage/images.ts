// Photos: processed on the phone, kept in IndexedDB (so they show instantly and work offline), and uploaded to a private
// Supabase Storage bucket in the background. An item only stores small refs (id + size) in meta.images.
import { useEffect, useState } from 'react';
import { cloud } from '../cloudClient';

export interface ImgRef { id: string; w: number; h: number }
const BUCKET = 'omokage-images', DB = 'omokage-img', ST = 'img';
interface Rec { id: string; full?: Blob; thumb?: Blob; up: 0 | 1 }

const db = (): Promise<IDBDatabase> => new Promise((res, rej) => {
  const r = indexedDB.open(DB, 1);
  r.onupgradeneeded = () => r.result.createObjectStore(ST, { keyPath: 'id' });
  r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
});
const tx = async <T,>(mode: IDBTransactionMode, f: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> => {
  const d = await db();
  return new Promise((res, rej) => { const r = f(d.transaction(ST, mode).objectStore(ST)); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
};
const getRec = (id: string) => tx<Rec | undefined>('readonly', s => s.get(id));
const putRec = (r: Rec) => tx('readwrite', s => s.put(r));
const delRec = (id: string) => tx('readwrite', s => s.delete(id));
const allRecs = () => tx<Rec[]>('readonly', s => s.getAll());

const toJpeg = async (src: ImageBitmap, max: number, q: number): Promise<Blob> => {
  const k = Math.min(1, max / Math.max(src.width, src.height)), w = Math.round(src.width * k), h = Math.round(src.height * k);
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d')!; g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.drawImage(src, 0, 0, w, h);
  return new Promise((res, rej) => c.toBlob(b => (b ? res(b) : rej(new Error('encode failed'))), 'image/jpeg', q));
};

/** Shrinks a picked or pasted image (full ≤ 2048px, thumb ≤ 480px), stores both locally, and queues the upload. */
export const addImage = async (file: Blob): Promise<ImgRef> => {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  const [full, thumb] = await Promise.all([toJpeg(bmp, 2048, .85), toJpeg(bmp, 480, .78)]);
  const ref: ImgRef = { id: crypto.randomUUID(), w: bmp.width, h: bmp.height };
  bmp.close?.();
  await putRec({ id: ref.id, full, thumb, up: 0 });
  void flushUploads();
  return ref;
};
/** Forget photos that were never saved to an item, or whose item was deleted. */
export const dropImages = async (ids: string[]) => {
  for (const id of ids) {
    await delRec(id).catch(() => undefined);
    const s = cloud?.getSession();
    if (cloud && s) cloud.storage.remove(BUCKET, [`${s.user.id}/${id}.jpg`, `${s.user.id}/${id}_t.jpg`]).catch(() => undefined);
  }
};

let flushing = false;
export const flushUploads = async () => {
  const s = cloud?.getSession();
  if (!cloud || !s || flushing || !navigator.onLine) return;
  flushing = true;
  try {
    for (const r of await allRecs()) {
      if (r.up || !r.full || !r.thumb) continue;
      try {
        await cloud.storage.put(BUCKET, `${s.user.id}/${r.id}.jpg`, r.full);
        await cloud.storage.put(BUCKET, `${s.user.id}/${r.id}_t.jpg`, r.thumb);
        await putRec({ ...r, up: 1 });
      } catch (e) { console.error('image upload', e); break; }
    }
  } finally { flushing = false; }
};
if (typeof window !== 'undefined') window.addEventListener('online', () => void flushUploads());

/** Blob for a photo: from this phone if it's there, otherwise downloaded once from storage and kept. */
const fetchBlob = async (id: string, kind: 'full' | 'thumb'): Promise<Blob | null> => {
  const rec = await getRec(id);
  const have = rec?.[kind];
  if (have) return have;
  const s = cloud?.getSession();
  if (!cloud || !s) return null;
  try {
    const b = await cloud.storage.get(BUCKET, `${s.user.id}/${id}${kind === 'thumb' ? '_t' : ''}.jpg`);
    await putRec({ ...(rec ?? { id, up: 1 }), id, [kind]: b, up: rec?.up ?? 1 } as Rec);
    return b;
  } catch { return null; }
};

const urls = new Map<string, { url: string; n: number }>();
/** An object URL for a photo (thumb or full), or null while it loads / if it can't be found. */
export const useImg = (id: string | undefined, kind: 'full' | 'thumb' = 'thumb'): string | null => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    const key = `${id}:${kind}`; let dead = false;
    const hit = urls.get(key);
    if (hit) { hit.n++; setUrl(hit.url); }
    else void fetchBlob(id, kind).then(b => {
      if (dead || !b) return;
      const e = urls.get(key) ?? { url: URL.createObjectURL(b), n: 0 };
      e.n++; urls.set(key, e); setUrl(e.url);
    });
    return () => {
      dead = true;
      const e = urls.get(key);
      if (e && --e.n <= 0) { setTimeout(() => { const x = urls.get(key); if (x && x.n <= 0) { URL.revokeObjectURL(x.url); urls.delete(key); } }, 4000); }
    };
  }, [id, kind]);
  return id ? url : null;
};
