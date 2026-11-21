// Photos: the original file is kept byte-for-byte (no recompression); only a small thumbnail is generated for browsing. Kept in IndexedDB (so they show instantly and work offline), and uploaded to a private
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

/** Keeps the picked or pasted file exactly as it came (original bytes), makes a small thumbnail for browsing, and queues the upload. */
export const addImage = async (file: Blob): Promise<ImgRef> => {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  const thumb = await toJpeg(bmp, 480, .78), full: Blob = file;
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
  } catch {
    if (kind !== 'thumb') return null;
    // photos saved from outside the app (the iOS Shortcut) have no thumbnail yet: make one from the original, once
    try {
      const full = await fetchBlob(id, 'full'); if (!full) return null;
      const bmp = await createImageBitmap(full, { imageOrientation: 'from-image' } as ImageBitmapOptions);
      const thumb = await toJpeg(bmp, 480, .78); bmp.close?.();
      const cur = await getRec(id);
      await putRec({ ...(cur ?? { id, up: 1 }), id, thumb, up: cur?.up ?? 1 } as Rec);
      return thumb;
    } catch { return null; }
  }
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

const toPng = async (b: Blob): Promise<Blob> => {
  const bmp = await createImageBitmap(b, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  const c = document.createElement('canvas'); c.width = bmp.width; c.height = bmp.height;
  c.getContext('2d')!.drawImage(bmp, 0, 0); bmp.close?.();
  return new Promise((res, rej) => c.toBlob(x => (x ? res(x) : rej(new Error('encode failed'))), 'image/png'));
};
const ext = (t: string) => (t.split('/')[1] || 'jpg').replace('jpeg', 'jpg').replace(/\+.*/, '');
/** Original bytes of a photo (from this phone, or downloaded once). */
export const getOriginal = (id: string) => fetchBlob(id, 'full');

/**
 * Puts the original photos on the clipboard (one or many). Browsers only accept PNG on the clipboard, so JPEGs are
 * converted losslessly to PNG for that. If the clipboard refuses several images, falls back to the share sheet,
 * which hands over the untouched original files (and has Copy / Save to Photos).
 */
export const copyImages = async (ids: string[]): Promise<'copied' | 'shared'> => {
  const blob = (id: string) => getOriginal(id).then(b => { if (!b) throw new Error('photo not available'); return b; });
  const png = (id: string) => blob(id).then(b => (b.type === 'image/png' ? b : toPng(b)));
  const CI = (window as unknown as { ClipboardItem?: typeof ClipboardItem }).ClipboardItem;
  let err: unknown;
  if (CI && navigator.clipboard?.write) {
    try {
      // promises keep the tap's permission alive while the photos load
      await navigator.clipboard.write(ids.map(id => new CI({ 'image/png': png(id) })));
      return 'copied';
    } catch (e) { err = e; }
  }
  const files = await Promise.all(ids.map(async (id, k) => { const b = await blob(id); return new File([b], `photo-${k + 1}.${ext(b.type)}`, { type: b.type || 'image/jpeg' }); }));
  if (navigator.canShare?.({ files })) { await navigator.share({ files }); return 'shared'; }
  throw err ?? new Error('copy not supported');
};
