// Tiles: how every artifact looks at every snap size on the capsule grid.
//
// HOW TO EXTEND (the whole system is the KINDS table at the bottom):
//   1. classify() turns an item into one kind ('tweet', 'article', 'photo', …). Add a new kind by adding a test there.
//   2. Each kind has auto(a) → its default size, and view(a, size) → what it draws.
//   3. A tile that looks wrong shows its "kind · size" in its sheet ("Flag this look" saves meta.flag). Find that kind
//      below and change the branch for that size. Nothing else needs touching.
// Sizes are spans on a 4-column grid of square cells (see SIZES); a renderer always fills its whole tile.
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { useImg, type ImgRef } from './images';
import { imgsOf, useItems, type Item } from './items';
import { linkOf, noteOf, urlOf, type LinkMeta } from './link';
import { isCapsule, ordered, parentOf } from './capsules';
import { INK, INK2 } from './skins';

export type Size = 's' | 'sq' | 't' | 'w' | 'l' | 'h';
/** [columns, rows] on the 4-column grid. */
export const SIZES: Record<Size, [number, number]> = { s: [2, 1], sq: [2, 2], t: [2, 3], w: [4, 1], l: [4, 2], h: [4, 4] };
export const SIZE_NAME: Record<Size, string> = { s: 'small', sq: 'square', t: 'tall', w: 'wide', l: 'large', h: 'hero' };
export const SIZE_ORDER: Size[] = ['s', 'w', 'sq', 't', 'l', 'h'];

/* ---------- the artifact, pre-digested once ---------- */
export interface Art { item: Item; kind: Kind; url: string | null; text: string; link: LinkMeta | null; imgs: ImgRef[]; host: string }
const hostOf = (u: string | null) => { if (!u) return ''; try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return ''; } };
const PRODUCT_HOSTS = /(^|\.)(amazon|walmart|etsy|ebay|bestbuy|ikea|target|costco|uniqlo|muji|aliexpress|lego|brickeconomy|shopify|wayfair|homedepot|canadiantire|sephora|apple)\./i;

export type Kind = 'capsule' | 'tweet' | 'tweet-media' | 'article' | 'page' | 'wiki' | 'product' | 'web-image' | 'link-pending' | 'photo' | 'photos' | 'photo-note' | 'question' | 'short' | 'long';

export const classify = (item: Item): Art => {
  const url = urlOf(item.body), link = linkOf(item), imgs = imgsOf(item);
  const text = (url ? noteOf(item.body) : item.body).trim(), host = hostOf(url);
  const a = { item, url, text, link, imgs, host } as Omit<Art, 'kind'>;
  const k = ((): Kind => {
    if (isCapsule(item)) return 'capsule';
    if (link?.kind === 'tweet') return link.photos?.length ? 'tweet-media' : 'tweet';
    if (link?.kind === 'image') return 'web-image';
    if (link) {
      if (/(^|\.)wikipedia\.org$/.test(host)) return 'wiki';
      if (link.price || link.product || PRODUCT_HOSTS.test(host + '.') || /\/(dp|product|products|item|p)\//i.test(url ?? '')) return 'product';
      return link.image ? 'article' : 'page';
    }
    if (url) return imgs.length ? 'photo-note' : 'link-pending';
    if (imgs.length) return text ? 'photo-note' : imgs.length > 1 ? 'photos' : 'photo';
    if (text.endsWith('?')) return 'question';
    return text.length <= 140 ? 'short' : 'long';
  })();
  return { ...a, kind: k };
};

/* ---------- primitives ---------- */
const clamp = (n: number): CSSProperties => ({ display: '-webkit-box', WebkitLineClamp: n, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' });
const fill: CSSProperties = { position: 'absolute', inset: 0 };
const col = (gap = 0, extra?: CSSProperties): CSSProperties => ({ display: 'flex', flexDirection: 'column', gap, minWidth: 0, minHeight: 0, ...extra });
const PAPER = '#FBF8F2', SOFT = 'rgba(43,50,71,.06)';
/** Paper washed with the tile's own colour (--tint, set from its picture; plain paper when there is none). */
const WASH = 'linear-gradient(rgba(var(--tint),.17), rgba(var(--tint),.17)), #FBF8F2';

/* ---------- colour taken from a picture ---------- */
const TK = 'omk_tints';
const tints: Map<string, string | null> = (() => { try { return new Map(Object.entries(JSON.parse(localStorage.getItem(TK) || '{}'))); } catch { return new Map(); } })();
const waiting = new Map<string, Promise<string | null>>();
const saveTints = () => { try { localStorage.setItem(TK, JSON.stringify(Object.fromEntries([...tints].slice(-500)))); } catch { /* full */ } };
/** The picture's main colour as "r,g,b": an average that favours saturated mid-tones, so a red jacket wins over grey sky. */
const sample = (src: string, cors: boolean) => new Promise<string | null>(res => {
  const im = new Image(); if (cors) im.crossOrigin = 'anonymous'; im.referrerPolicy = 'no-referrer';
  im.onload = () => {
    try {
      const c = document.createElement('canvas'); c.width = c.height = 14; const x = c.getContext('2d')!; x.drawImage(im, 0, 0, 14, 14);
      const d = x.getImageData(0, 0, 14, 14).data; let r = 0, g = 0, b = 0, w = 0;
      for (let i = 0; i < d.length; i += 4) {
        const R = d[i], G = d[i + 1], B = d[i + 2], mx = Math.max(R, G, B), mn = Math.min(R, G, B), sat = mx ? (mx - mn) / mx : 0, l = (mx + mn) / 510;
        const wt = Math.max(0, .12 + sat * (1 - Math.abs(l - .5) * 1.7)); r += R * wt; g += G * wt; b += B * wt; w += wt;
      }
      res(w ? `${Math.round(r / w)},${Math.round(g / w)},${Math.round(b / w)}` : null);
    } catch { res(null); }
  };
  im.onerror = () => res(null); im.src = src;
});
const useTint = (key: string | undefined, src: string | null | undefined, cors: boolean) => {
  const [t, setT] = useState<string | null>(() => (key ? tints.get(key) ?? null : null));
  useEffect(() => {
    if (!key) { setT(null); return; }
    if (tints.has(key)) { setT(tints.get(key) ?? null); return; }
    if (!src) return;
    let on = true;
    const p = waiting.get(key) ?? sample(src, cors).then(v => { tints.set(key, v); waiting.delete(key); saveTints(); return v; });
    waiting.set(key, p); void p.then(v => { if (on) setT(v); });
    return () => { on = false; };
  }, [key, src, cors]);
  return t;
};
/** An artifact's colour: from its first photo, else its link or tweet picture. null while unknown or when it has none. */
export const useArtTint = (item: Item | undefined): string | null => {
  const a = item ? classify(item) : null, r = a?.imgs[0], local = useImg(r?.id, 'thumb');
  const web = !r && a ? (a.link?.kind === 'tweet' ? a.link.photos?.[0]?.url : a.link?.image || (a.kind === 'web-image' ? a.url : undefined)) : undefined;
  return useTint(r ? r.id : web || undefined, r ? local : web, !r);
};
/** CSS variables for a tint: --tint is the colour, --shade a deep version of it for scrims. */
export const tintVars = (t: string | null): CSSProperties => {
  if (!t) return {};
  const [r, g, b] = t.split(',').map(Number), k = .28;
  return { ['--tint' as string]: t, ['--shade' as string]: `${Math.round(r * k)},${Math.round(g * k)},${Math.round(b * k)}` };
};

/** An image that covers its box: a local photo (by ref) or a web image (by url). */
export const Pic = ({ r, src, fit = 'cover', style, full }: { r?: ImgRef; src?: string; fit?: 'cover' | 'contain'; style?: CSSProperties; full?: boolean }) => {
  const local = useImg(r?.id, full ? 'full' : 'thumb');
  const u = r ? local : src;
  return (
    <span style={{ display: 'block', overflow: 'hidden', background: fit === 'contain' ? '#fff' : SOFT, minHeight: 0, ...style }}>
      {u && <img src={u} alt="" draggable={false} loading="lazy" referrerPolicy="no-referrer" onError={e => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
        style={{ width: '100%', height: '100%', objectFit: fit, display: 'block', padding: fit === 'contain' ? '8%' : 0, boxSizing: 'border-box' }} />}
    </span>
  );
};
const Site = ({ a, size = 9.5, light }: { a: Art; size?: number; light?: boolean }) => (
  <span className="caps" style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: size, letterSpacing: '.12em', color: light ? 'rgba(255,255,255,.85)' : INK2, minWidth: 0 }}>
    {a.link?.icon && <img src={a.link.icon} alt="" referrerPolicy="no-referrer" style={{ width: size + 2, height: size + 2, borderRadius: 2, flex: 'none' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />}
    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.link?.site || a.host}</span>
  </span>
);
const Pad = ({ children, p = 13, style }: { children: ReactNode; p?: number; style?: CSSProperties }) => <div style={{ ...fill, padding: p, ...col(0), ...style }}>{children}</div>;
/** Text that shows as many whole lines as fit (never a half-cut line), up to `lines`. It shrinks within a flex column. */
const Fit = ({ lines, lh, className, style, children, shrink = 1 }: { lines: number; lh: number; className?: string; style: CSSProperties; children: ReactNode; shrink?: number }) => {
  const ref = useRef<HTMLDivElement>(null), [n, setN] = useState(lines);
  useLayoutEffect(() => {
    const el = ref.current, box = el?.parentElement; if (!el || !box) return;
    let last = -1;
    const fit = () => {
      const h = box.clientHeight; if (h === last) return; last = h;
      el.style.webkitLineClamp = String(lines); el.style.maxHeight = 'none';
      const px = parseFloat(getComputedStyle(el).fontSize) * lh, room = el.clientHeight;
      setN(Math.max(1, Math.min(lines, Math.floor((room + 1) / px))));
    };
    fit(); const ro = new ResizeObserver(fit); ro.observe(box); return () => ro.disconnect();
  }, [lines, lh, children]);
  return <div ref={ref} className={className} style={{ ...style, lineHeight: lh, flex: `0 ${shrink} auto`, minHeight: 0, ...clamp(n) }}>{children}</div>;
};
const Title = ({ children, size, lines, italic, style }: { children: ReactNode; size: number; lines: number; italic?: boolean; style?: CSSProperties }) =>
  <Fit lines={lines} lh={1.28} shrink={.15} className={italic ? 'it' : 'serif'} style={{ fontSize: size, color: INK, letterSpacing: italic ? 0 : '-.005em', ...style }}>{children}</Fit>;
const Body = ({ children, size = 12, lines, style }: { children: ReactNode; size?: number; lines: number; style?: CSSProperties }) =>
  <Fit lines={lines} lh={1.42} shrink={6} style={{ fontSize: size, color: INK2, ...style }}>{children}</Fit>;
/** A soft scrim so text can sit on a photo. */
const Scrim = ({ children, p = 12 }: { children: ReactNode; p?: number }) => (
  <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, padding: `${p * 2.4}px ${p}px ${p}px`, background: 'linear-gradient(to top, rgba(var(--shade),.78), rgba(var(--shade),0))', color: '#fff' }}>{children}</div>
);
const when = (s?: string) => { if (!s) return ''; const d = new Date(s); return isNaN(+d) ? '' : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }); };

/** Up to n photos laid out to fill a box; the last shows +N when there are more. */
const Mosaic = ({ cells, layout, more }: { cells: ReactNode[]; layout: string; more?: number }) => {
  const L: Record<string, { cols: string; rows: string; areas: string[] }> = {
    '1': { cols: '1fr', rows: '1fr', areas: ['a'] },
    '2h': { cols: '1fr 1fr', rows: '1fr', areas: ['a b'] },
    '2v': { cols: '1fr', rows: '1fr 1fr', areas: ['a', 'b'] },
    '3l': { cols: '1.6fr 1fr', rows: '1fr 1fr', areas: ['a b', 'a c'] },
    '3t': { cols: '1fr 1fr', rows: '1.5fr 1fr', areas: ['a a', 'b c'] },
    '4': { cols: '1fr 1fr', rows: '1fr 1fr', areas: ['a b', 'c d'] },
    '4s': { cols: '1fr 1fr 1fr 1fr', rows: '1fr', areas: ['a b c d'] },
    '4l': { cols: '1.7fr 1fr 1fr', rows: '1fr 1fr', areas: ['a b c', 'a d d'] },
  };
  const l = L[layout] ?? L['4'], names = 'abcd'.split(''), n = new Set(l.areas.join(' ').split(' ')).size, shown = cells.slice(0, n);
  return (
    <div style={{ ...fill, display: 'grid', gridTemplateColumns: l.cols, gridTemplateRows: l.rows, gridTemplateAreas: l.areas.map(x => `"${x}"`).join(' '), gap: 2, background: '#fff' }}>
      {shown.map((c, k) => (
        <div key={k} style={{ gridArea: names[k], position: 'relative', minHeight: 0, overflow: 'hidden' }}>
          {c}
          {!!more && more > 0 && k === shown.length - 1 && <span className="serif" style={{ ...fill, display: 'grid', placeItems: 'center', background: 'rgba(20,22,32,.42)', color: '#fff', fontSize: 20 }}>+{more}</span>}
        </div>
      ))}
    </div>
  );
};
const layoutFor = (n: number, size: Size) => n <= 1 ? '1' : n === 2 ? (size === 't' ? '2v' : '2h') : n === 3 ? (size === 't' || size === 'sq' ? '3t' : '3l') : size === 'w' ? '4s' : size === 'l' || size === 'h' ? '4l' : '4';

/* ---------- renderers ---------- */
type V = (a: Art, size: Size) => ReactNode;

const tweetV: V = (a, size) => {
  const t = a.link!, au = typeof t.author === 'object' ? t.author : {}, text = t.article?.title || t.text || '';
  const Who = ({ s = 22 }: { s?: number }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 'none' }}>
      {au.avatar ? <img src={au.avatar} alt="" referrerPolicy="no-referrer" style={{ width: s, height: s, borderRadius: '50%', objectFit: 'cover', flex: 'none' }} /> : <span style={{ width: s, height: s, borderRadius: '50%', background: SOFT, flex: 'none' }} />}
      <span style={{ minWidth: 0, lineHeight: 1.15 }}>
        <span style={{ display: 'block', fontSize: 11.5, fontWeight: 600, color: INK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{au.name || au.handle}</span>
        {s >= 22 && au.handle && <span style={{ display: 'block', fontSize: 10, color: INK2 }}>@{au.handle}</span>}
      </span>
      <span style={{ marginLeft: 'auto', fontSize: 11, color: INK2, flex: 'none' }}>𝕏</span>
    </div>
  );
  const photo = t.photos?.[0];
  if (a.kind === 'tweet-media' && photo) {
    const P = <Pic src={photo.url} style={{ width: '100%', height: '100%' }} />;
    if (size === 's') return <div style={fill}>{P}<Scrim p={9}><div className="it" style={{ fontSize: 12, lineHeight: 1.25, ...clamp(2) }}>{text}</div></Scrim></div>;
    if (size === 'w') return <div style={{ ...fill, display: 'flex' }}><div style={{ width: '34%', flex: 'none' }}>{P}</div><Pad p={10} style={{ position: 'relative', flex: 1, justifyContent: 'center', gap: 4, background: WASH }}><Title italic size={13.5} lines={2}>{text}</Title><span style={{ fontSize: 10, color: INK2 }}>@{au.handle}</span></Pad></div>;
    if (size === 'l') return <div style={{ ...fill, display: 'flex' }}><div style={{ width: '50%', flex: 'none' }}>{P}</div><Pad style={{ position: 'relative', flex: 1, gap: 8, background: WASH }}><Who /><Title italic size={14.5} lines={5}>{text}</Title></Pad></div>;
    if (size === 'sq') return <div style={{ ...fill, ...col() }}><div style={{ height: '56%', flex: 'none' }}>{P}</div><div style={{ padding: '8px 10px', flex: 1, ...col(4), background: WASH }}><Title italic size={12.5} lines={2}>{text}</Title><span style={{ fontSize: 10, color: INK2 }}>@{au.handle}</span></div></div>;
    if (size === 't') return <div style={{ ...fill, ...col(), background: WASH }}><div style={{ padding: '11px 11px 8px', ...col(7), flex: 'none' }}><Who /><Title italic size={13.5} lines={5}>{text}</Title></div><div style={{ minHeight: 0 }}>{P}</div></div>;
    return <div style={{ ...fill, ...col() }}><div style={{ height: '58%', flex: 'none' }}>{P}</div><div style={{ padding: 14, flex: 1, ...col(8), background: WASH }}><Who /><Title italic size={17} lines={5}>{text}</Title></div></div>;
  }
  if (size === 's') return <Pad p={10} style={{ gap: 5 }}><Who s={16} /><Title italic size={12.5} lines={2}>{text}</Title></Pad>;
  if (size === 'w') return <Pad p={12} style={{ justifyContent: 'center', gap: 5 }}><Title italic size={15} lines={2}>“{text}”</Title><span style={{ fontSize: 10.5, color: INK2 }}>{au.name} · @{au.handle}</span></Pad>;
  const n = text.length, big = size === 'h' ? (n < 140 ? 27 : n < 300 ? 21 : 17) : size === 'l' ? (n < 120 ? 20 : 16) : size === 't' ? 14.5 : 13.5;
  const lines = size === 'h' ? 14 : size === 'l' ? 5 : size === 't' ? 11 : 6;
  return <Pad p={size === 'h' ? 18 : 12} style={{ gap: 9, background: PAPER }}><Who /><Title italic size={big} lines={lines} style={{ whiteSpace: 'pre-line', margin: size === 'h' || size === 'l' ? 'auto 0' : undefined }}>{text}</Title><span className="caps" style={{ marginTop: 'auto', fontSize: 9, letterSpacing: '.12em' }}>{when(t.at)}</span></Pad>;
};

const articleV: V = (a, size) => {
  const t = a.link!, P = <Pic src={t.image} style={{ width: '100%', height: '100%' }} />;
  if (size === 's') return <div style={{ ...fill, display: 'flex' }}><div style={{ width: 80, flex: 'none' }}>{P}</div><Pad p={9} style={{ position: 'relative', flex: 1, gap: 3, background: WASH }}><Site a={a} size={8.5} /><Title size={12.5} lines={3}>{t.title}</Title></Pad></div>;
  if (size === 'w') return <div style={{ ...fill, display: 'flex' }}><div style={{ width: 120, flex: 'none' }}>{P}</div><Pad p={10} style={{ position: 'relative', flex: 1, gap: 4, justifyContent: 'center', background: WASH }}><Site a={a} size={8.5} /><Title size={14} lines={2}>{t.title}</Title></Pad></div>;
  if (size === 'sq') return <div style={{ ...fill, ...col() }}><div style={{ height: '52%', flex: 'none' }}>{P}</div><div style={{ padding: '8px 10px', flex: 1, ...col(4), background: WASH }}><Site a={a} size={8.5} /><Title size={13.5} lines={3}>{t.title}</Title></div></div>;
  if (size === 't') return <div style={{ ...fill, ...col() }}><div style={{ height: '44%', flex: 'none' }}>{P}</div><div style={{ padding: '10px 11px', flex: 1, ...col(5), background: WASH }}><Site a={a} size={8.5} /><Title size={15} lines={3}>{t.title}</Title>{t.desc && <Body size={11.5} lines={5}>{t.desc}</Body>}</div></div>;
  if (size === 'l') return <div style={{ ...fill, display: 'flex' }}><div style={{ width: '46%', flex: 'none' }}>{P}</div><Pad style={{ position: 'relative', flex: 1, gap: 6, background: WASH }}><Site a={a} /><Title size={16.5} lines={3}>{t.title}</Title>{t.desc && <Body lines={3}>{t.desc}</Body>}</Pad></div>;
  return <div style={{ ...fill, ...col() }}><div style={{ height: '56%', flex: 'none' }}>{P}</div><div style={{ padding: 16, flex: 1, ...col(7), background: WASH }}><Site a={a} /><Title size={21} lines={3}>{t.title}</Title>{t.desc && <Body size={13} lines={4}>{t.desc}</Body>}</div></div>;
};

/** A link with no picture: a typographic card on paper. Wikipedia gets its own serif mark. */
const pageV: V = (a, size) => {
  const t = a.link, title = t?.title || a.host, desc = t?.desc, wiki = a.kind === 'wiki';
  const mark = wiki && size !== 's' && size !== 'w' && <span aria-hidden="true" className="serif" style={{ position: 'absolute', right: -6, bottom: -26, fontSize: size === 'h' ? 210 : 120, lineHeight: 1, color: 'rgba(43,50,71,.05)' }}>W</span>;
  const thumb = wiki && t?.image && (size === 'sq' || size === 't' || size === 'l' || size === 'h') &&
    <Pic src={t.image} style={{ width: size === 'h' ? 76 : 46, height: size === 'h' ? 76 : 46, borderRadius: '50%', flex: 'none', marginBottom: 4 }} />;
  const head = <Site a={a} size={size === 's' || size === 'w' ? 8.5 : 9.5} />;
  if (size === 's') return <Pad p={10} style={{ gap: 3, background: PAPER }}>{head}<Title size={13} lines={2}>{title}</Title></Pad>;
  if (size === 'w') return <Pad p={12} style={{ gap: 3, background: PAPER, justifyContent: 'center' }}>{head}<Title size={15} lines={1}>{title}</Title>{desc && <Body size={11} lines={1}>{desc}</Body>}</Pad>;
  const ts = size === 'h' ? 32 : size === 'l' ? 21 : size === 't' ? 18 : 16, dl = size === 'h' ? 8 : size === 't' ? 8 : size === 'l' ? 3 : 2;
  return <Pad p={size === 'h' ? 22 : 12} style={{ gap: 6, background: PAPER, overflow: 'hidden', justifyContent: size === 'h' || size === 'l' ? 'center' : 'flex-start' }}>{mark}{thumb}{head}<Title size={ts} lines={size === 'sq' ? 3 : 4} style={{ position: 'relative' }}>{title}</Title>{desc && <Body size={size === 'h' ? 13 : 11.5} lines={dl} style={{ position: 'relative', fontFamily: wiki ? 'Lora, serif' : undefined }}>{desc}</Body>}</Pad>;
};

const productV: V = (a, size) => {
  const t = a.link!, P = <Pic src={t.image} fit="contain" style={{ width: '100%', height: '100%' }} />;
  const price = t.price && <span style={{ alignSelf: 'flex-start', fontSize: 11.5, fontWeight: 600, color: INK, background: 'linear-gradient(rgba(var(--tint),.22), rgba(var(--tint),.22)), #F3EBDD', borderRadius: 99, padding: '3px 9px' }}>{t.currency && t.currency !== 'USD' && t.currency !== 'CAD' ? t.currency + ' ' : '$'}{t.price}</span>;
  if (size === 's' || size === 'w') return <div style={{ ...fill, display: 'flex', background: '#fff' }}><div style={{ width: size === 's' ? 74 : 96, flex: 'none' }}>{P}</div><Pad p={9} style={{ position: 'relative', flex: 1, gap: 4, justifyContent: 'center' }}><Title size={12.5} lines={size === 's' ? 2 : 2}>{t.title}</Title>{price || <Site a={a} size={8.5} />}</Pad></div>;
  if (size === 'l') return <div style={{ ...fill, display: 'flex', background: '#fff' }}><div style={{ width: '46%', flex: 'none' }}>{P}</div><Pad style={{ position: 'relative', flex: 1, gap: 6 }}><Site a={a} /><Title size={16} lines={3}>{t.title}</Title>{price}{t.desc && <Body lines={2}>{t.desc}</Body>}</Pad></div>;
  const ih = size === 'h' ? '64%' : size === 't' ? '58%' : '62%';
  return <div style={{ ...fill, ...col(), background: '#fff' }}><div style={{ height: ih, flex: 'none' }}>{P}</div><div style={{ padding: '6px 11px 10px', ...col(5), flex: 1, borderTop: '1px solid rgba(43,50,71,.06)' }}><Title size={size === 'h' ? 19 : 13} lines={2}>{t.title}</Title>{price || <Site a={a} size={8.5} />}{size === 't' && t.desc && <Body size={11} lines={3}>{t.desc}</Body>}</div></div>;
};

const photoV: V = (a, size) => {
  const r = a.imgs[0], src = a.kind === 'web-image' ? (a.link?.image || a.url || undefined) : undefined, cap = r?.cap || (a.kind === 'web-image' ? a.text : '');
  return <div style={fill}><Pic r={r} src={src} full={size === 'h' || size === 'l'} style={{ width: '100%', height: '100%' }} />{cap && size !== 's' && size !== 'w' && <Scrim><div className="it" style={{ fontSize: size === 'h' ? 16 : 12.5, ...clamp(2) }}>{cap}</div></Scrim>}</div>;
};
const photosV: V = (a, size) => {
  const max = size === 's' ? 2 : size === 'w' ? 4 : 4, cells = a.imgs.slice(0, max).map(r => <Pic key={r.id} r={r} style={{ width: '100%', height: '100%' }} />);
  return <Mosaic cells={cells} layout={layoutFor(cells.length, size)} more={a.imgs.length - cells.length} />;
};
const photoNoteV: V = (a, size) => {
  const n = a.imgs.length, imgBox = n > 1 ? <Mosaic cells={a.imgs.slice(0, 4).map(r => <Pic key={r.id} r={r} style={{ width: '100%', height: '100%' }} />)} layout={layoutFor(Math.min(n, 4), size === 'l' ? 'sq' : size)} more={n - 4} /> : <Pic r={a.imgs[0]} style={{ width: '100%', height: '100%' }} />;
  const text = a.text || (a.link?.title ?? a.host);
  if (size === 's' || size === 'w') return <div style={{ ...fill, display: 'flex' }}><div style={{ width: size === 's' ? 74 : 96, flex: 'none', position: 'relative' }}>{imgBox}</div><Pad p={10} style={{ position: 'relative', flex: 1, justifyContent: 'center', background: WASH }}><Title size={12.5} lines={3}>{text}</Title></Pad></div>;
  if (size === 'l') return <div style={{ ...fill, display: 'flex' }}><div style={{ width: '52%', flex: 'none', position: 'relative' }}>{imgBox}</div><Pad style={{ position: 'relative', flex: 1, justifyContent: 'center', background: WASH }}><Title size={14.5} lines={6}>{text}</Title></Pad></div>;
  const ih = size === 'h' ? '62%' : size === 't' ? '52%' : '58%';
  return <div style={{ ...fill, ...col() }}><div style={{ height: ih, flex: 'none', position: 'relative' }}>{imgBox}</div><div style={{ padding: '9px 11px', flex: 1, minHeight: 0, background: WASH, ...col() }}><Title size={size === 'h' ? 17 : 13} lines={size === 'h' ? 5 : size === 't' ? 7 : 3}>{text}</Title></div></div>;
};

const questionV: V = (a, size) => {
  const fs = { s: 13.5, w: 16, sq: 17, t: 18, l: 21, h: 27 }[size], lines = { s: 3, w: 2, sq: 5, t: 8, l: 4, h: 8 }[size];
  return <Pad p={size === 'h' ? 22 : 12} style={{ justifyContent: 'center', background: PAPER, overflow: 'hidden' }}>
    {size !== 's' && size !== 'w' && <span aria-hidden="true" className="serif" style={{ position: 'absolute', right: 6, top: -14, fontSize: size === 'h' ? 180 : 96, lineHeight: 1, color: 'rgba(196,70,58,.08)' }}>?</span>}
    <Title italic size={fs} lines={lines} style={{ position: 'relative' }}>{a.text}</Title>
  </Pad>;
};
const shortV: V = (a, size) => {
  const n = a.text.length, fs = { s: 13, w: 15, sq: n < 60 ? 19 : 16, t: n < 60 ? 21 : 17, l: n < 80 ? 24 : 19, h: n < 80 ? 34 : 26 }[size], lines = { s: 3, w: 2, sq: 6, t: 9, l: 4, h: 8 }[size];
  return <Pad p={size === 'h' ? 24 : 12} style={{ justifyContent: 'center' }}><Title size={fs} lines={lines} style={{ whiteSpace: 'pre-line' }}>{a.text}</Title></Pad>;
};
/** Long writing: a first short line becomes its heading; the rest is set as a page and fades at the bottom. */
const longV: V = (a, size) => {
  const [first, ...rest] = a.text.split('\n'), head = first.length <= 70 && rest.join('').trim() ? first : '', body = head ? rest.join('\n').trim() : a.text;
  const fs = size === 'h' ? 14.5 : size === 'l' ? 13.5 : 12.5;
  return <Pad p={size === 'h' ? 18 : 12} style={{ gap: 5, background: PAPER }}>
    {head && <Title size={size === 'h' ? 20 : size === 's' || size === 'w' ? 13.5 : 15.5} lines={size === 's' ? 2 : 2}>{head}</Title>}
    {size !== 's' && <div className="serif" style={{ fontSize: fs, lineHeight: 1.5, color: '#3A4156', whiteSpace: 'pre-line', overflow: 'hidden', overflowWrap: 'anywhere', flex: 1, minHeight: 0, WebkitMaskImage: 'linear-gradient(to bottom, #000 70%, transparent)', maskImage: 'linear-gradient(to bottom, #000 70%, transparent)' }}>{body}</div>}
    {size === 's' && !head && <Title size={12.5} lines={3}>{body}</Title>}
  </Pad>;
};
const pendingV: V = (a, size) => {
  let path = ''; try { path = decodeURIComponent(new URL(a.url!).pathname).replace(/[-_/]+/g, ' ').trim(); } catch { /* raw */ }
  const big = size === 'h' || size === 'l' || size === 't';
  return <Pad p={size === 'h' ? 22 : 11} style={{ gap: 4, background: PAPER, justifyContent: 'center', overflow: 'hidden' }}>
    {big && <span aria-hidden="true" className="serif" style={{ position: 'absolute', right: 8, top: -10, fontSize: size === 'h' ? 150 : 90, lineHeight: 1, color: 'rgba(43,50,71,.05)' }}>↗</span>}
    <span className="caps" style={{ fontSize: 9, letterSpacing: '.12em', position: 'relative' }}>↗ {a.host}</span>
    <Title size={size === 'h' ? 28 : size === 'l' ? 20 : size === 's' || size === 'w' ? 13 : 16} lines={size === 's' ? 2 : 4} style={{ position: 'relative' }}>{a.text || path || a.host}</Title>
  </Pad>;
};

/* ---------- capsules ---------- */
/** One small preview square of something inside a capsule. */
const Peek = ({ i }: { i: Item }) => {
  const a = classify(i);
  if (a.imgs[0]) return <Pic r={a.imgs[0]} style={{ width: '100%', height: '100%' }} />;
  const im = a.link?.kind === 'tweet' ? a.link.photos?.[0]?.url : a.link?.image;
  if (im) return <Pic src={im} fit={a.kind === 'product' ? 'contain' : 'cover'} style={{ width: '100%', height: '100%' }} />;
  const words = a.kind === 'capsule' ? i.title : a.link?.title || a.link?.text || a.text || a.host;
  return <span style={{ ...fill, padding: 6, background: a.kind === 'capsule' ? '#EFE6D3' : PAPER, display: 'flex', alignItems: 'flex-end' }}><span className={a.kind === 'question' ? 'it' : 'serif'} style={{ fontSize: 9.5, lineHeight: 1.25, color: INK, ...clamp(3) }}>{words}</span></span>;
};
const CapsuleTile = ({ a, size }: { a: Art; size: Size }) => {
  const { items } = useItems();
  const kids = ordered(items.filter(i => i.kind === 'future' && parentOf(i) === a.item.id));
  const visual = kids.filter(visualKid);
  const peeks = [...visual, ...kids.filter(k => !visual.includes(k))].slice(0, 4);
  const name = a.item.title || 'Untitled', count = `${kids.length} ${kids.length === 1 ? 'artifact' : 'artifacts'}`;
  const t1 = useArtTint(visual[0]), t2 = useArtTint(visual[1] ?? visual[0]);
  // its cover mood: paper warmed by the colours of what's inside
  const MOOD = t1 ? `linear-gradient(155deg, rgba(${t1},.26), rgba(${t2 ?? t1},.12) 70%), #F6EEE0` : '#F6EEE0';
  const nest = kids.filter(isCapsule).length;
  const meta = <span style={{ fontSize: 10.5, color: INK2 }}>{count}{nest ? ` · ${nest} capsule${nest === 1 ? '' : 's'}` : ''}</span>;
  const mosaic = (n: number, lay: string) => <Mosaic cells={peeks.slice(0, n).map(k => <Peek key={k.id} i={k} />)} layout={peeks.length ? layoutFor(Math.min(n, peeks.length), lay as Size) : '1'} />;
  const tab = <span aria-hidden="true" style={{ position: 'absolute', left: 12, top: 0, width: 26, height: 4, borderRadius: '0 0 3px 3px', background: '#C4463A', opacity: .75 }} />;
  if (size === 's') return <Pad p={11} style={{ justifyContent: 'center', gap: 2, background: MOOD }}>{tab}<Title size={14.5} lines={1}>{name}</Title>{meta}</Pad>;
  if (size === 'w') return <div style={{ ...fill, display: 'flex', background: MOOD }}>{tab}<Pad p={12} style={{ position: 'relative', flex: 1, justifyContent: 'center', gap: 2 }}><Title size={16} lines={1}>{name}</Title>{meta}</Pad>
    <div style={{ display: 'flex', gap: 3, padding: 8, flex: 'none' }}>{peeks.slice(0, 3).map(k => <span key={k.id} style={{ width: 62, height: 62, borderRadius: 6, overflow: 'hidden', position: 'relative' }}><Peek i={k} /></span>)}</div></div>;
  if (size === 'l') return <div style={{ ...fill, display: 'flex', background: MOOD }}><div style={{ width: '50%', position: 'relative', flex: 'none' }}>{peeks.length ? mosaic(4, 'sq') : null}</div>
    <Pad style={{ position: 'relative', flex: 1, gap: 4 }}><Title size={20} lines={2}>{name}</Title>{meta}<div style={{ marginTop: 6, ...col(3) }}>{kids.filter(k => !/^\d+ photos?$/.test(gistOf(k))).slice(0, 3).map(k => <span key={k.id} style={{ fontSize: 11, color: INK2, ...clamp(1) }}>· {gistOf(k)}</span>)}</div></Pad></div>;
  const ih = size === 'h' ? '64%' : size === 't' ? '66%' : '64%';
  return <div style={{ ...fill, ...col(), background: MOOD }}><div style={{ height: ih, position: 'relative', flex: 'none' }}>{peeks.length ? mosaic(size === 't' ? 3 : 4, size === 'h' ? 'h' : size) : <span className="serif" style={{ ...fill, display: 'grid', placeItems: 'center', fontSize: 30, color: 'rgba(43,50,71,.18)' }}>{name[0]}</span>}</div>
    <div style={{ padding: size === 'h' ? '12px 16px' : '8px 11px', flex: 1, ...col(2) }}><Title size={size === 'h' ? 24 : 15} lines={1}>{name}</Title>{meta}{size === 'h' && kids.filter(k => !/^\d+ photos?$/.test(gistOf(k))).slice(0, 2).map(k => <span key={k.id} style={{ fontSize: 11.5, color: INK2, marginTop: 2, ...clamp(1) }}>· {gistOf(k)}</span>)}</div></div>;
};
/** One short line naming an item. */
export const gistOf = (i: Item) => { const a = classify(i); if (a.kind === 'capsule') return i.title || 'Untitled'; if (a.link?.kind === 'tweet') return a.link.text || 'Post on X'; return a.link?.title || a.text || (a.imgs.length ? `${a.imgs.length} photo${a.imgs.length > 1 ? 's' : ''}` : a.host) || '…'; };

/* ---------- the table ---------- */
const aspect = (a: Art) => { const r = a.imgs[0]; return r && r.w && r.h ? r.w / r.h : 1; };
export interface Env { kids: (id: string) => Item[] }
const visualKid = (k: Item) => !!(imgsOf(k).length || linkOf(k)?.image || linkOf(k)?.photos?.length);
export const KINDS: Record<Kind, { label: string; auto: (a: Art, env?: Env) => Size; view: V }> = {
  capsule: { label: 'capsule', auto: (a, env) => (env && env.kids(a.item.id).some(visualKid) ? 'sq' : 's'), view: (a, s) => <CapsuleTile a={a} size={s} /> },
  tweet: { label: 'tweet', auto: a => { const n = (a.link?.text || '').length; return n < 90 ? 'w' : n < 220 ? 'sq' : 't'; }, view: tweetV },
  'tweet-media': { label: 'tweet with media', auto: a => { const p = a.link?.photos?.[0]; return p?.w && p?.h && p.w / p.h > 1.2 ? 'l' : 't'; }, view: tweetV },
  article: { label: 'article', auto: () => 'sq', view: articleV },
  page: { label: 'link', auto: a => (a.link?.desc ? 'sq' : 's'), view: pageV },
  wiki: { label: 'wikipedia', auto: () => 'sq', view: pageV },
  product: { label: 'product', auto: () => 'sq', view: productV },
  'web-image': { label: 'web image', auto: () => 'sq', view: photoV },
  'link-pending': { label: 'link (no preview yet)', auto: () => 's', view: pendingV },
  photo: { label: 'photo', auto: a => { const r = aspect(a); return r < .8 ? 't' : r > 2.4 ? 'w' : r > 1.35 ? 'l' : 'sq'; }, view: photoV },
  photos: { label: 'photos', auto: a => (a.imgs.length >= 3 ? 'l' : 'sq'), view: photosV },
  'photo-note': { label: 'photo with note', auto: a => (a.text.length > 110 ? 't' : 'sq'), view: photoNoteV },
  question: { label: 'question', auto: a => (a.text.length <= 60 ? 'w' : 'sq'), view: questionV },
  short: { label: 'short note', auto: a => (a.text.length <= 36 ? 's' : a.text.length <= 100 ? 'w' : 'sq'), view: shortV },
  long: { label: 'long note', auto: a => (a.text.length < 600 ? 't' : 'l'), view: longV },
};
const isSize = (v: unknown): v is Size => typeof v === 'string' && v in SIZES;
/** The size a tile shows at: the one you picked, else the kind's default. */
export const sizeOf = (a: Art, env?: Env): Size => (isSize(a.item.meta?.size) ? a.item.meta!.size as Size : KINDS[a.kind].auto(a, env));
/** A tile's insides, with its colour set as --tint / --shade for the renderers to wash text panels and scrims with. */
export const TileBody = ({ a, size }: { a: Art; size: Size }) => {
  const t = useArtTint(a.kind === 'capsule' ? undefined : a.item);
  return <div style={{ ...fill, ...tintVars(t) }}>{KINDS[a.kind].view(a, size)}</div>;
};
