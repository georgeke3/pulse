import { useState } from 'react';
import { useApp } from '../store';
import { Butterfly, Wisps } from './Art';
import { useItems } from './items';
import { usePastEntries } from './Past';
import { DOT, dstr, fmtMin, fromDstr, parseHM, todayStr, type Mode } from './skins';

export const Home = ({ go, onPulse }: { go: (m: Mode) => void; onPulse: () => void }) => {
  const { state } = useApp();
  const { items } = useItems();
  const past = usePastEntries();
  const now = new Date(), today = todayStr();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState<string | null>(null);
  const first = new Date(ym.y, ym.m, 1), dim = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (string | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= dim; d++) cells.push(dstr(new Date(ym.y, ym.m, d)));
  const pastDays = new Set(past.map(p => p.day));
  const futDays = new Set(items.filter(i => i.kind === 'future').map(i => i.day));
  const flags = (d: string) => ({ past: pastDays.has(d), present: (state.days[d]?.events.length ?? 0) > 0 || Object.keys(state.days[d]?.answers ?? {}).length > 0, future: futDays.has(d) });
  const shift = (n: number) => { setSel(null); setYm(({ y, m }) => { const t = new Date(y, m + n, 1); return { y: t.getFullYear(), m: t.getMonth() }; }); };

  const td = state.days[today];
  const nq = state.config.daily_questions.length;
  const answered = Object.keys(td?.answers ?? {}).length;
  const pastDone = pastDays.has(today);
  const inbox = items.filter(i => i.kind === 'future' && (i.board || 'Inbox') === 'Inbox').length;
  const timed = (td?.events ?? []).map(e => parseHM(e.custom_data?.time)).filter((x): x is number => x !== null);
  const lastMin = timed.length ? Math.max(...timed) : null;
  const rows: { label: string; mode: 'past' | 'present' | 'future'; done: boolean; act: () => void }[] = [
    { label: answered >= nq ? 'Evening pulse, done' : answered ? `Evening pulse, ${nq - answered} left` : `Evening pulse, ${nq} questions`, mode: 'present', done: answered >= nq, act: onPulse },
    { label: pastDone ? 'Tonight’s question, written' : 'Tonight’s question', mode: 'past', done: pastDone, act: () => go('past') },
    ...(inbox ? [{ label: `Sort ${inbox} inbox idea${inbox > 1 ? 's' : ''}`, mode: 'future' as const, done: false, act: () => go('future') }] : []),
    { label: lastMin === null ? 'Nothing logged yet today' : `Log anything after ${fmtMin(lastMin)}`, mode: 'present', done: false, act: () => go('present') },
  ];

  const wk = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return dstr(d); });
  const wkLoad = wk.reduce((a, d) => a + (state.days[d]?.events.filter(e => e.type === 'training').length ?? 0), 0);
  const wkRest = wk.reduce((a, d) => a + (state.days[d]?.events.filter(e => e.type === 'recovery').length ?? 0), 0);
  const wkPast = wk.filter(d => pastDays.has(d)).length;
  const mottos = state.mottos;
  const motto = mottos.length ? mottos[Math.floor(Date.now() / 864e5) % mottos.length] : 'Small, steady, and kind.';
  const hour = now.getHours();
  const greet = hour < 5 ? 'Late night' : hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const sd = sel ? state.days[sel] : null;
  const selPast = sel ? past.filter(p => p.day === sel) : [];
  const selFut = sel ? items.filter(i => i.kind === 'future' && i.day === sel) : [];
  const selAvg = sd && Object.values(sd.answers).length ? (Object.values(sd.answers).reduce((a, b) => a + b, 0) / Object.values(sd.answers).length).toFixed(1) : null;

  return (
    <div className="screen">
      <div style={{ position: 'relative', minHeight: 92, gap: 3, flex: 'none', borderRadius: 14, overflow: 'hidden', padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        background: 'linear-gradient(115deg, rgba(250,248,243,.95) 0%, rgba(243,232,207,.92) 52%, rgba(214,222,232,.95) 100%)', boxShadow: 'inset 0 0 0 1px rgba(184,146,74,.55), inset 0 0 0 3px rgba(255,255,255,.6), 0 8px 20px rgba(60,50,30,.10)' }}>
        <Wisps h={100} />
        <span style={{ position: 'absolute', right: 22, top: 14, transform: 'rotate(12deg)', opacity: .8 }}><Butterfly c="#6F86A3" s={16} /></span>
        <span style={{ position: 'absolute', right: 46, top: 32, transform: 'rotate(-18deg)', opacity: .55 }}><Butterfly c="#9B3A44" s={11} /></span>
        <span className="caps" style={{ position: 'relative' }}>{greet}</span>
        <div className="quote" style={{ position: 'relative', fontSize: motto.length > 42 ? 15.5 : 17.5, lineHeight: 1.28, maxWidth: 300, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{motto}</div>
        <div style={{ position: 'relative', display: 'flex', gap: 12, fontSize: 11, color: 'var(--fg2)' }}>
          <span><b style={{ color: DOT.present }}>{wkLoad}</b> load · <b style={{ color: '#4E5D78' }}>{wkRest}</b> rest</span>
          <span><b style={{ color: DOT.past }}>{wkPast}</b>/7 written</span>
          <span><b style={{ color: DOT.future }}>{inbox}</b> to sort</span>
          <span style={{ marginLeft: 'auto' }}>this week</span>
        </div>
      </div>

      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <span style={{ display: 'flex', alignItems: 'center' }}>
            <button className="press" aria-label="Previous month" onClick={() => shift(-1)} style={{ width: 28, height: 28, fontSize: 18, color: 'var(--fg2)' }}>‹</button>
            <span className="serif" style={{ fontSize: 17, minWidth: 128, textAlign: 'center' }}>{first.toLocaleString('en', { month: 'long', year: 'numeric' })}</span>
            <button className="press" aria-label="Next month" onClick={() => shift(1)} style={{ width: 28, height: 28, fontSize: 18, color: 'var(--fg2)' }}>›</button>
          </span>
          <span style={{ display: 'flex', gap: 8, fontSize: 10.5, color: 'var(--fg2)' }}>
            {(['past', 'present', 'future'] as const).map(k => <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 3 }}><i style={{ width: 6, height: 6, borderRadius: 3, background: DOT[k] }} />{k}</span>)}
          </span>
        </div>
        <div className="cal">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i} className="caps" style={{ textAlign: 'center', fontSize: 9.5, paddingBottom: 3 }}>{d}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const f = flags(d);
            return (
              <button key={d} className={`day ${d === today ? 'today' : ''} ${d === sel ? 'sel' : ''} ${d > today ? 'fut' : ''}`} onClick={() => setSel(d === sel ? null : d)}>
                <span>{+d.slice(8)}</span>
                <span className="dots">{(['past', 'present', 'future'] as const).map(k => <i key={k} style={{ background: f[k] ? DOT[k] : 'rgba(120,110,90,.14)' }} />)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grow" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 8, overflow: 'hidden' }}>
        {!sel && cells.length <= 35 && <WeekStrip />}
        {sel ? (
          <div key={sel} style={{ background: 'rgba(255,255,255,.6)', borderRadius: 12, padding: '10px 12px', boxShadow: 'inset 0 0 0 1px rgba(184,146,74,.45)', animation: 'enter .3s both', display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '100%', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span className="serif" style={{ fontSize: 16 }}>{fromDstr(sel).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
              <button className="press" onClick={() => setSel(null)} style={{ fontSize: 12, color: 'var(--fg2)' }}>Today ›</button>
            </div>
            <div style={{ display: 'flex', gap: 14, fontSize: 12.5 }}>
              <span><b>{sd?.events.filter(e => e.type === 'training').length ?? 0}</b> load</span>
              <span><b>{sd?.events.filter(e => e.type === 'recovery').length ?? 0}</b> rest</span>
              <span><b>{sd?.events.filter(e => e.type === 'win').length ?? 0}</b> wins</span>
              <span style={{ marginLeft: 'auto' }}>pulse <b className="serif">{selAvg ?? '—'}</b></span>
            </div>
            {selPast[0] && <div className="quote" style={{ fontSize: 13.5, lineHeight: 1.45, display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden', borderTop: '1px dashed rgba(143,163,184,.6)', paddingTop: 6 }}><span style={{ color: DOT.past }}>● </span>{selPast[0].body.split('\n').join(' · ')}</div>}
            {selFut.slice(0, 2).map(i => <div key={i.id} style={{ fontSize: 13 }}><span style={{ color: DOT.future }}>● </span>{i.body.slice(0, 80)}</div>)}
            {!selPast.length && !sd && !selFut.length && <div className="quote mute" style={{ fontSize: 13.5 }}>A quiet day in the record.</div>}
          </div>
        ) : (
          <div>
            <div className="caps" style={{ marginBottom: 2 }}>Tonight</div>
            {rows.map(r => (
              <button key={r.label} className="todo" style={{ width: '100%' }} onClick={r.act}>
                <span className={`box ${r.done ? 'done' : ''}`}>{r.done ? '✓' : ''}</span>
                <span style={{ flex: 1, fontSize: 15, opacity: r.done ? .5 : 1 }}>{r.label}</span>
                <span className="tag"><i style={{ background: DOT[r.mode] }} />{r.mode[0].toUpperCase() + r.mode.slice(1)}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

/* Seven days at a glance: load above the line, rest below, pulse as a thread. */
const WeekStrip = () => {
  const { state } = useApp();
  const { items } = useItems();
  const past = usePastEntries();
  const days = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - 6 + i); return d; });
  const W = 340, H = 58, Y = 26, colW = (W - 20) / 7;
  const data = days.map(d => {
    const k = dstr(d), ev = state.days[k]?.events ?? [];
    const a = Object.values(state.days[k]?.answers ?? {});
    return {
      k, d, load: ev.filter(e => e.type === 'training').reduce((s, e) => s + (e.objectiveIntensity || 1), 0),
      rest: ev.filter(e => e.type === 'recovery').reduce((s, e) => s + (e.objectiveIntensity || 1), 0),
      pulse: a.length ? a.reduce((x, y) => x + y, 0) / a.length : null,
      wrote: past.some(p => p.day === k), idea: items.some(i => i.kind === 'future' && i.day === k),
    };
  });
  const max = Math.max(12, ...data.map(x => Math.max(x.load, x.rest)));
  const cx = (i: number) => 10 + colW * i + colW / 2;
  const py = (v: number) => Y - 3 - ((v - 1) / 3) * 18;
  const pts = data.map((x, i) => (x.pulse === null ? null : `${cx(i)},${py(x.pulse)}`)).filter(Boolean);
  const today = todayStr();
  return (
    <div style={{ flex: '0 1 auto', minHeight: 0 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 2 }}>
        <span className="caps">Last seven days</span>
        <span style={{ fontSize: 10.5, color: 'var(--fg2)', display: 'flex', gap: 8 }}><span style={{ color: '#C4643F' }}>▲ load</span><span style={{ color: '#4E5D78' }}>▼ rest</span><span style={{ color: '#8A6A2E' }}>— pulse</span></span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block', overflow: 'visible' }} aria-label="Last seven days">
        <line x1="10" x2={W - 10} y1={Y} y2={Y} stroke="#B8924A" strokeWidth="1" opacity=".55" />
        {data.map((x, i) => (
          <g key={x.k}>
            {x.k === today && <rect x={cx(i) - colW / 2 + 2} y={0} width={colW - 4} height={H} rx={8} fill="rgba(255,255,255,.45)" stroke="rgba(184,146,74,.5)" />}
            <rect x={cx(i) - 9} y={Y - 1 - (x.load / max) * 20} width={7} height={(x.load / max) * 20} rx={2} fill="#C4643F" opacity=".85" />
            <rect x={cx(i) + 2} y={Y + 1} width={7} height={(x.rest / max) * 14} rx={2} fill="#4E5D78" opacity=".8" />
            <text x={cx(i)} y={H - 4} fontSize="9" textAnchor="middle" fill="#6E6858" fontFamily="Inter, sans-serif" fontWeight={x.k === today ? 600 : 400}>{x.d.toLocaleDateString('en', { weekday: 'narrow' })}{x.d.getDate()}</text>
            {x.wrote && <circle cx={cx(i) - 5} cy={H - 15} r="2" fill={DOT.past} />}
            {x.idea && <circle cx={cx(i) + 5} cy={H - 15} r="2" fill={DOT.future} />}
          </g>
        ))}
        {pts.length > 1 && <polyline points={pts.join(' ')} fill="none" stroke="#8A6A2E" strokeWidth="1.3" strokeDasharray="3 2" />}
        {data.map((x, i) => x.pulse !== null && <circle key={'p' + i} cx={cx(i)} cy={py(x.pulse)} r="2.6" fill="#F7F1E3" stroke="#8A6A2E" strokeWidth="1.3" />)}
      </svg>
    </div>
  );
};
