// Link previews for pins: a saved URL is unfurled once on the server (api/unfurl.ts) and the result is kept on the item (meta.link),
// so cards render instantly, offline, and sync with the item. Tweets show as quotes; pages as a cover + title + blurb.
import { useEffect } from 'react';
import { cloud, cloudConfigured } from '../cloudClient';
import type { Item } from './items';
import { INK, INK2 } from './skins';

export interface LinkMeta {
  kind: 'tweet' | 'page' | 'image'; url: string; site?: string;
  title?: string; desc?: string; image?: string; icon?: string; author?: string | { name?: string; handle?: string; avatar?: string };
  text?: string; at?: string; photos?: { url: string; w?: number; h?: number; video?: boolean }[];
  quote?: { name?: string; handle?: string; text?: string }; article?: { title?: string; preview?: string; image?: string };
}

export const URL_RE = /(https?:\/\/[^\s]+)/i;
export const urlOf = (body: string) => body.match(URL_RE)?.[1] ?? null;
/** The note written beside a link, if any (the pin body minus the URL). */
export const noteOf = (body: string) => body.replace(URL_RE, '').trim();
export const linkOf = (i: Item): LinkMeta | null => { const l = i.meta?.link as LinkMeta | undefined; return l && l.url ? l : null; };

const inflight = new Set<string>();
/** Unfurls every link pin that has no preview yet (one at a time, once per session per item). */
export const useUnfurl = (items: Item[], save: (id: string, meta: Record<string, unknown>) => void) => {
  const todo = items.filter(i => i.kind === 'future' && !i.meta?.link && !i.meta?.linkFail && urlOf(i.body)).map(i => i.id).join(',');
  useEffect(() => {
    const token = cloudConfigured ? cloud?.getSession()?.access_token : undefined;
    if (!token || !todo) return;
    let dead = false;
    (async () => {
      for (const id of todo.split(',').slice(0, 6)) {
        const it = items.find(x => x.id === id); const url = it && urlOf(it.body);
        if (!it || !url || inflight.has(id)) continue;
        inflight.add(id);
        try {
          const r = await fetch('/api/unfurl', { method: 'POST', headers: { 'content-type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ url }) });
          if (!r.ok) continue;                       // signed out / server hiccup: try again next visit
          const j = await r.json();
          if (!dead) save(id, j.link ? { ...(it.meta ?? {}), link: j.link } : { ...(it.meta ?? {}), linkFail: new Date().toISOString().slice(0, 10) });
        } catch { /* offline: retry later */ } finally { inflight.delete(id); }
      }
    })();
    return () => { dead = true; };
  }, [todo]); // eslint-disable-line react-hooks/exhaustive-deps
};

const when = (s?: string) => { if (!s) return ''; const d = new Date(s); return isNaN(+d) ? '' : d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' }); };
const clamp = (n: number): React.CSSProperties => ({ display: '-webkit-box', WebkitLineClamp: n, WebkitBoxOrient: 'vertical', overflow: 'hidden' });
const Xmark = () => <svg width="11" height="11" viewBox="0 0 24 24" aria-hidden="true" fill={INK2}><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>;
const Photo = ({ src, ratio, alt = '' }: { src: string; ratio?: number; alt?: string }) => (
  <img src={src} alt={alt} loading="lazy" draggable={false} referrerPolicy="no-referrer" style={{ display: 'block', width: '100%', aspectRatio: ratio ? String(ratio) : undefined, objectFit: 'cover', borderRadius: 4, background: 'rgba(43,50,71,.06)' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
);

/** The preview card shown inside a pin. `open` lifts the text clamps. */
export const LinkCard = ({ link, note, open }: { link: LinkMeta; note: string; open: boolean }) => {
  const host = (() => { try { return new URL(link.url).hostname.replace(/^www\./, ''); } catch { return link.site || ''; } })();

  if (link.kind === 'tweet') {
    const a = typeof link.author === 'object' ? link.author : {};
    const ph = link.photos?.[0], ratio = ph?.w && ph?.h ? Math.max(.7, Math.min(1.8, ph.w / ph.h)) : 1.5;
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          {a.avatar ? <img src={a.avatar} alt="" referrerPolicy="no-referrer" style={{ width: 26, height: 26, borderRadius: '50%', objectFit: 'cover', flex: 'none' }} /> : <span style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(43,50,71,.1)', flex: 'none' }} />}
          <span style={{ minWidth: 0, flex: 1, lineHeight: 1.2 }}>
            <span style={{ display: 'block', fontSize: 12, fontWeight: 600, color: INK, ...clamp(1) }}>{a.name || a.handle}</span>
            {a.handle && <span style={{ display: 'block', fontSize: 10.5, color: INK2, ...clamp(1) }}>@{a.handle}</span>}
          </span>
          <Xmark />
        </div>
        {link.article?.title
          ? <><div className="serif" style={{ fontSize: 15, lineHeight: 1.3, ...(open ? {} : clamp(4)) }}>{link.article.title}</div>
              {link.article.preview && <div style={{ fontSize: 12, lineHeight: 1.4, color: INK2, marginTop: 4, ...(open ? {} : clamp(3)) }}>{link.article.preview}</div>}</>
          : link.text && <div className="it" style={{ fontSize: 14.5, lineHeight: 1.42, whiteSpace: 'pre-wrap', wordBreak: 'break-word', ...(open ? {} : clamp(9)) }}>{link.text}</div>}
        {ph && <div style={{ marginTop: 8, position: 'relative' }}><Photo src={ph.url} ratio={ratio} />{ph.video && <span style={{ position: 'absolute', left: 6, bottom: 6, fontSize: 9.5, letterSpacing: '.12em', color: '#fff', background: 'rgba(43,50,71,.7)', borderRadius: 3, padding: '2px 5px' }}>VIDEO</span>}</div>}
        {link.quote?.text && <div style={{ marginTop: 8, borderLeft: '2px solid rgba(43,50,71,.2)', paddingLeft: 8, fontSize: 11.5, lineHeight: 1.4, color: INK2, ...(open ? {} : clamp(3)) }}><b style={{ fontWeight: 600, color: INK }}>{link.quote.name}</b> {link.quote.text}</div>}
        {note && <div style={{ marginTop: 8, fontSize: 12.5, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{note}</div>}
        <div className="caps" style={{ marginTop: 8, fontSize: 9, letterSpacing: '.14em' }}>{when(link.at) || 'X'}</div>
      </div>
    );
  }

  if (link.kind === 'image') return <div><Photo src={link.image!} />{note && <div style={{ marginTop: 6, fontSize: 12.5 }}>{note}</div>}<div className="caps" style={{ marginTop: 6, fontSize: 9 }}>↗ {host}</div></div>;

  const wide = !!link.image;
  return (
    <div>
      {wide && <div style={{ margin: '-14px -14px 10px', borderRadius: '6px 6px 0 0', overflow: 'hidden' }}><Photo src={link.image!} ratio={1.7} /></div>}
      <div className="caps" style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 5, fontSize: 9, letterSpacing: '.14em' }}>
        {link.icon && <img src={link.icon} alt="" referrerPolicy="no-referrer" style={{ width: 11, height: 11, borderRadius: 2, flex: 'none' }} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />}
        <span style={{ ...clamp(1), minWidth: 0 }}>{link.site || host}</span>
      </div>
      {link.title && <div className="serif" style={{ fontSize: 15, lineHeight: 1.3, letterSpacing: '-.005em', ...(open ? {} : clamp(wide ? 3 : 5)) }}>{link.title}</div>}
      {link.desc && <div style={{ fontSize: 12, lineHeight: 1.42, color: INK2, marginTop: 5, ...(open ? {} : clamp(wide ? 2 : 4)) }}>{link.desc}</div>}
      {note && <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px dashed rgba(43,50,71,.2)', fontSize: 12.5, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{note}</div>}
    </div>
  );
};
