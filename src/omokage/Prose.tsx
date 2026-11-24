import { useLayoutEffect, useRef, useState } from 'react';
import { INK2 } from './skins';

const URL_SPLIT = /(https?:\/\/[^\s]+)/g;
const short = (u: string) => { try { const x = new URL(u); const p = x.pathname.replace(/\/$/, ''); return x.hostname.replace(/^www\./, '') + (p.length > 1 ? (p.length > 18 ? p.slice(0, 17) + '…' : p) : ''); } catch { return u; } };

/** Long free text, shown properly: paragraphs kept, long words and links wrapped (never off the edge), links tappable,
 *  the size eases down as the text grows, and when it is taller than its space it scrolls with a soft fade. `copy` adds a Copy link. */
export const Prose = ({ text, copy, style }: { text: string; copy?: boolean; style?: React.CSSProperties }) => {
  const t = text.trim(), n = t.length;
  const ref = useRef<HTMLDivElement>(null), [more, setMore] = useState(false), [done, setDone] = useState(false);
  const measure = () => { const el = ref.current; if (el) setMore(el.scrollHeight - el.scrollTop - el.clientHeight > 6); };
  useLayoutEffect(measure, [t]);
  const size = n <= 140 ? 17 : n <= 420 ? 16 : 15;
  const parts = t.split(URL_SPLIT);
  return (
    <div style={{ position: 'relative', flex: '1 1 auto', minHeight: 0, display: 'flex', flexDirection: 'column', ...style }}>
      <div ref={ref} onScroll={measure} className="prose" style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0, whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', fontFamily: 'Lora, serif', fontStyle: 'italic', fontSize: size, lineHeight: 1.5, color: '#3A4156', userSelect: 'text', WebkitUserSelect: 'text', paddingBottom: more ? 20 : 0 }}>
        {parts.map((p, i) => i % 2 ? <a key={i} href={p} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'underline', textDecorationColor: 'rgba(43,50,71,.35)', textUnderlineOffset: 3 }}>{short(p)}</a> : p)}
      </div>
      {more && <div aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, bottom: copy ? 22 : 0, height: 34, pointerEvents: 'none', background: 'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,.98))' }} />}
      {copy && n > 220 && <button className="caps press" style={{ alignSelf: 'flex-end', padding: '6px 0 0', fontSize: 9.5, color: INK2 }} onClick={() => { void navigator.clipboard?.writeText(t).then(() => { setDone(true); setTimeout(() => setDone(false), 1400); }); }}>{done ? 'Copied' : 'Copy text'}</button>}
    </div>
  );
};
