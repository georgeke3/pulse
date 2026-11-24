// Vercel serverless function: turns a link into a small preview card (title, description, cover image, or a tweet's text/author/photo).
// Runs server-side so pages that block browsers (CORS) can be read; only signed-in users may call it.
const UA = 'Mozilla/5.0 (compatible; facebookexternalhit/1.1; +https://omokage.app) Omokage-Unfurl';
const MAX_BYTES = 600_000;

async function signedIn(token: string): Promise<boolean> {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key || !token) return false;
  const r = await fetch(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
  return r.ok;
}

/** Public http(s) hosts only: no localhost, raw IPs or internal names. */
const safeUrl = (s: string): URL | null => {
  try {
    const u = new URL(s);
    if (!/^https?:$/.test(u.protocol)) return null;
    const h = u.hostname.toLowerCase();
    if (!h.includes('.') || h === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(h) || h.includes(':') || /\.(local|internal|lan)$/.test(h)) return null;
    return u;
  } catch { return null; }
};

const unent = (s: string) => s
  .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
  .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&quot;/g, '"').replace(/&apos;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&');
const clip = (s: string | undefined, n: number) => { const t = (s || '').replace(/\s+/g, ' ').trim(); return t.length > n ? t.slice(0, n - 1).trimEnd() + '…' : t; };

const abs = (base: URL, v?: string) => { if (!v) return undefined; try { const u = new URL(unent(v), base); return /^https?:$/.test(u.protocol) ? u.href : undefined; } catch { return undefined; } };

/** <meta property|name="k" content="v"> in either attribute order. */
const metas = (html: string) => {
  const m = new Map<string, string>();
  for (const t of html.match(/<meta\b[^>]*>/gi) || []) {
    const k = t.match(/\b(?:property|name)\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
    const v = t.match(/\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i);
    if (k && v && !m.has(k)) m.set(k, unent(v[1] ?? v[2] ?? ''));
  }
  return m;
};

async function readText(r: Response): Promise<string> {
  const rd = r.body?.getReader(); if (!rd) return '';
  const dec = new TextDecoder(); let out = '', n = 0;
  while (n < MAX_BYTES) { const { done, value } = await rd.read(); if (done) break; n += value.length; out += dec.decode(value, { stream: true }); if (/<\/head>/i.test(out)) break; }
  try { await rd.cancel(); } catch { /* already closed */ }
  return out;
}

const tweetId = (u: URL) => {
  if (!/^(www\.|mobile\.)?(x|twitter|fxtwitter|vxtwitter|fixupx)\.com$/.test(u.hostname)) return null;
  const m = u.pathname.match(/^\/([^/]+)\/status(?:es)?\/(\d+)/);
  return m ? { user: m[1], id: m[2] } : null;
};

async function tweet(t: { user: string; id: string }, url: string) {
  // fxtwitter exposes the full text, author, avatar and photos; fall back to Twitter's own oEmbed (text + author only)
  try {
    const r = await fetch(`https://api.fxtwitter.com/${t.user}/status/${t.id}`, { headers: { 'user-agent': UA }, signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const j: any = await r.json(), x = j?.tweet;
      if (x?.text !== undefined) {
        const photos = (x.media?.photos || []).map((p: any) => ({ url: p.url, w: p.width, h: p.height }));
        const vid = x.media?.videos?.[0];
        if (!photos.length && vid?.thumbnail_url) photos.push({ url: vid.thumbnail_url, w: vid.width, h: vid.height, video: true });
        const q = x.quote;
        return {
          kind: 'tweet', url, site: 'X',
          author: { name: x.author?.name, handle: x.author?.screen_name, avatar: x.author?.avatar_url },
          text: String(x.text || '').trim(), at: x.created_at, photos: photos.slice(0, 4),
          quote: q?.text ? { name: q.author?.name, handle: q.author?.screen_name, text: clip(q.text, 220) } : undefined,
          article: x.article?.title ? { title: x.article.title, preview: clip(x.article.preview_text, 200), image: x.article.cover_media?.media_info?.original_img_url } : undefined,
        };
      }
    }
  } catch { /* try oEmbed */ }
  try {
    const r = await fetch(`https://publish.twitter.com/oembed?omit_script=1&dnt=1&url=${encodeURIComponent(`https://twitter.com/${t.user}/status/${t.id}`)}`, { signal: AbortSignal.timeout(8000) });
    if (r.ok) {
      const j: any = await r.json(), p = String(j.html || '').match(/<p[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '';
      const text = unent(p.replace(/<br\s*\/?>/gi, '\n').replace(/<a[^>]*>([\s\S]*?)<\/a>/gi, '$1').replace(/<[^>]+>/g, '')).trim();
      const at = String(j.html || '').match(/>([A-Z][a-z]+ \d{1,2}, \d{4})<\/a>\s*<\/blockquote>/)?.[1];
      if (text) return { kind: 'tweet', url, site: 'X', author: { name: j.author_name, handle: t.user }, text, at, photos: [] };
    }
  } catch { /* fall through to generic */ }
  return null;
}

async function page(u: URL, url: string) {
  const r = await fetch(u.href, { headers: { 'user-agent': UA, accept: 'text/html,application/xhtml+xml,image/*;q=0.8' }, redirect: 'follow', signal: AbortSignal.timeout(9000) });
  const ct = r.headers.get('content-type') || '';
  const site = u.hostname.replace(/^www\./, '');
  if (/^image\//.test(ct)) return { kind: 'image', url, site, image: r.url };
  if (!r.ok || !/html|xml/.test(ct)) return null;
  const html = await readText(r), m = metas(html), base = new URL(r.url);
  const title = m.get('og:title') || m.get('twitter:title') || html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const desc = m.get('og:description') || m.get('twitter:description') || m.get('description');
  const image = abs(base, m.get('og:image') || m.get('og:image:url') || m.get('twitter:image') || m.get('twitter:image:src'));
  const icon = abs(base, html.match(/<link[^>]+rel=["'](?:shortcut )?icon["'][^>]*>/i)?.[0].match(/href=["']([^"']+)["']/i)?.[1] || '/favicon.ico');
  if (!title && !desc && !image) return null;
  return {
    kind: 'page', url, site: clip(m.get('og:site_name'), 40) || site,
    title: clip(title ? unent(title) : undefined, 160), desc: clip(desc, 240), image, icon,
    price: m.get('product:price:amount') || m.get('og:price:amount') || undefined,
    currency: m.get('product:price:currency') || m.get('og:price:currency') || undefined,
    product: /product/i.test(m.get('og:type') || '') || undefined,
    author: clip(m.get('author') || m.get('article:author') || m.get('twitter:creator'), 60) || undefined,
  };
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!(await signedIn(token))) return res.status(401).json({ error: 'Sign in first.' });
  const raw = typeof req.body === 'string' ? JSON.parse(req.body || '{}').url : req.body?.url;
  const u = typeof raw === 'string' ? safeUrl(raw.trim()) : null;
  if (!u) return res.status(400).json({ error: 'Need a public http(s) url.' });
  try {
    const t = tweetId(u);
    const out = (t && (await tweet(t, u.href))) || (await page(u, u.href));
    if (!out) return res.status(200).json({ link: null });
    return res.status(200).json({ link: out });
  } catch (e: any) {
    return res.status(200).json({ link: null, note: e?.name || 'error' });
  }
}
