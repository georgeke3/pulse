import { useState } from 'react';
import { useApp } from '../store';
import { useItems } from './items';
import { DOT, SERIF, SKINS, dstr, fmtMin, parseHM, todayStr } from './skins';
import type { Mode } from './skins';

const S = SKINS.home;
export const Home = ({ go, onPulse }: { go: (m: Mode) => void; onPulse: () => void }) => {
  const { state } = useApp();
  const { items } = useItems();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState<string | null>(null);
  const first = new Date(ym.y, ym.m, 1), dim = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (string | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= dim; d++) cells.push(dstr(new Date(ym.y, ym.m, d)));
  const today = todayStr();
  const flags = (d: string) => ({
    past: items.some(i => i.kind === 'past' && i.day === d) || !!state.days[d]?.note?.trim(),
    present: (state.days[d]?.events.length ?? 0) > 0,
    future: items.some(i => i.kind === 'future' && i.day === d),
  });
  const shift = (n: number) => setYm(({ y, m }) => { const t = new Date(y, m + n, 1); return { y: t.getFullYear(), m: t.getMonth() }; });

  const td = state.days[today];
  const pulseDone = !!td && Object.keys(td.answers).length >= state.config.daily_questions.length;
  const pastDone = items.some(i => i.kind === 'past' && i.day === today) || !!td?.note?.trim();
  const inbox = items.filter(i => i.kind === 'future' && (i.board || 'Inbox') === 'Inbox').length;
  const timed = (td?.events ?? []).map(e => parseHM(e.custom_data?.time)).filter((x): x is number => x !== null);
  const lastMin = timed.length ? Math.max(...timed) : null;
  const rows: { label: string; tag: string; done: boolean; act: () => void }[] = [
    { label: `Evening pulse, ${state.config.daily_questions.length} questions`, tag: 'Present', done: pulseDone, act: onPulse },
    { label: "Tonight's question", tag: 'Past', done: pastDone, act: () => go('past') },
    ...(inbox ? [{ label: `Sort ${inbox} inbox item${inbox > 1 ? 's' : ''}`, tag: 'Future', done: false, act: () => go('future') }] : []),
    { label: lastMin === null ? 'Nothing logged yet today' : `Nothing logged after ${fmtMin(lastMin)}`, tag: 'Present', done: false, act: () => go('present') },
  ];
  const wk = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return dstr(d); });
  const wkLoad = wk.reduce((a, d) => a + (state.days[d]?.events.filter(e => e.type === 'training').length ?? 0), 0);
  const wkRest = wk.reduce((a, d) => a + (state.days[d]?.events.filter(e => e.type === 'recovery').length ?? 0), 0);
  const wkPast = wk.filter(d => flags(d).past).length;
  const newIdeas = items.filter(i => i.kind === 'future' && Date.now() - new Date(i.at).getTime() < 7 * 864e5).length;
  const mottos = state.mottos;
  const line = mottos.length ? mottos[Math.floor(Date.now() / 864e5) % mottos.length] : 'Small, steady, and kind.';
  const selDay = sel ? state.days[sel] : null;

  return (
    <div style={{ flex: 1, padding: '6px 16px', display: 'flex', flexDirection: 'column', gap: 10, minHeight: 0 }}>
      <div style={{ position: 'relative', height: 92, flex: 'none', border: '1.5px dashed #8FA3B8', borderRadius: 10, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 14px', boxSizing: 'border-box' }}>
        <svg viewBox="0 0 360 90" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden>
          <path d="M-10 62 C60 20 110 90 180 48 S300 10 370 40" stroke="#6F86A3" strokeWidth="2" fill="none" opacity=".45" />
          <path d="M-10 74 C70 40 130 98 200 62 S310 30 370 58" stroke="#B8924A" strokeWidth="2" fill="none" opacity=".5" />
          <path d="M-10 50 C50 70 120 20 190 38 S320 70 370 24" stroke="#9B3A44" strokeWidth="1.6" fill="none" opacity=".4" />
        </svg>
        <div style={{ position: 'relative', fontFamily: SERIF, fontStyle: 'italic', fontSize: 15, lineHeight: 1.35, textAlign: 'center' }}>{line}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <span style={{ fontFamily: SERIF, fontSize: 16 }}>
          <button onClick={() => shift(-1)} style={nav} aria-label="previous month">‹</button>{first.toLocaleString('en', { month: 'long', year: 'numeric' })}<button onClick={() => shift(1)} style={nav} aria-label="next month">›</button>
        </span>
        <span style={{ fontSize: 11, color: '#5F5A4E' }}><span style={{ color: DOT.past }}>●</span> past &nbsp;<span style={{ color: DOT.present }}>●</span> present &nbsp;<span style={{ color: DOT.future }}>●</span> future</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} style={{ textAlign: 'center', fontSize: 11, color: '#5F5A4E' }}>{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const f = flags(d), isToday = d === today, isSel = d === sel;
          return (
            <button key={d} onClick={() => setSel(isSel ? null : d)} style={{ height: 40, borderRadius: 8, textAlign: 'center', fontSize: 13, padding: '3px 0 0', boxSizing: 'border-box', border: isToday || isSel ? '1.5px solid #34405A' : '1.5px solid transparent', background: isSel ? '#F4F0E6' : 'transparent', color: '#34405A', fontFamily: 'inherit' }}>
              {+d.slice(8)}
              <div style={{ display: 'flex', gap: 3, justifyContent: 'center', marginTop: 2 }}>
                {(['past', 'present', 'future'] as const).map(k => <span key={k} style={{ width: 6, height: 6, borderRadius: '50%', background: f[k] ? DOT[k] : 'transparent', display: 'inline-block' }} />)}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', gap: 4, overflow: 'hidden' }}>
        {sel ? (
          <div style={{ border: '1.5px solid #cfc8b8', borderRadius: 10, padding: '8px 10px', background: S.card, overflowY: 'auto' }}>
            <div style={{ fontSize: 12, color: '#5F5A4E' }}>{sel} <button onClick={() => setSel(null)} style={{ background: 'none', border: 0, color: '#5F5A4E', textDecoration: 'underline', fontSize: 12, fontFamily: 'inherit' }}>back to today</button></div>
            <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0', fontSize: 14 }}>
              <span>Load {selDay?.events.filter(e => e.type === 'training').length ?? 0}</span><span>Rest {selDay?.events.filter(e => e.type === 'recovery').length ?? 0}</span><span>Wins {selDay?.events.filter(e => e.type === 'win').length ?? 0}</span>
            </div>
            {selDay?.note?.trim() && <div style={{ fontSize: 13, lineHeight: 1.4, borderTop: '1px solid #cfc8b8', paddingTop: 4, whiteSpace: 'pre-wrap', maxHeight: 120, overflow: 'hidden' }}>{selDay.note.trim()}</div>}
            {items.filter(i => i.day === sel).slice(0, 3).map(i => <div key={i.id} style={{ fontSize: 13, borderTop: '1px solid #cfc8b8', paddingTop: 4 }}><span style={{ color: DOT[i.kind] }}>● </span>{i.body.slice(0, 90)}</div>)}
          </div>
        ) : (<>
          <div style={{ fontSize: 12, color: '#5F5A4E' }}>Today: tap a row to do it right here</div>
          {rows.map(r => (
            <button key={r.label} onClick={r.act} style={{ display: 'flex', alignItems: 'center', gap: 12, height: 44, background: 'none', border: 0, borderBottom: '1px solid #cfc8b8', padding: 0, textAlign: 'left', fontFamily: 'inherit', color: '#34405A' }}>
              <span style={{ width: 18, height: 18, borderRadius: 4, border: '1.5px solid #9C7B3C', flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#9C7B3C' }}>{r.done ? '✓' : ''}</span>
              <span style={{ flex: 1, fontSize: 15, textDecoration: r.done ? 'line-through' : 'none', opacity: r.done ? .55 : 1 }}>{r.label}</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 99, background: '#ffffff66', color: '#5F5A4E' }}>{r.tag}</span>
            </button>
          ))}
        </>)}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 12, color: '#5F5A4E', paddingBottom: 10, flex: 'none' }}>
        <span>Load {wkLoad} · Rest {wkRest}<br />this week</span><span>Past: {wkPast} of 7<br />days written</span><span style={{ textAlign: 'right' }}>Future: {newIdeas} new<br />ideas</span>
      </div>
    </div>
  );
};
const nav: React.CSSProperties = { background: 'none', border: 0, fontSize: 18, color: '#5F5A4E', padding: '0 8px', fontFamily: 'inherit' };
