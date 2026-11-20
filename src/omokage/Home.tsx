import { useState } from 'react';
import { useApp } from '../store';
import { Belt, Fly, Pencil } from './Art';
import { useItems } from './items';
import { usePastEntries } from './Past';
import { CRIMSON, DOT, EMBER, GOLD, INK, INK2, SEPIA, SKY, dstr, fmtMin, fromDstr, parseHM, todayStr, type Mode } from './skins';

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

  const td = state.days[today], nq = state.config.daily_questions.length, answered = Object.keys(td?.answers ?? {}).length;
  const inbox = items.filter(i => i.kind === 'future' && (i.board || 'Inbox') === 'Inbox').length;
  const timed = (td?.events ?? []).map(e => parseHM(e.custom_data?.time)).filter((x): x is number => x !== null);
  const lastMin = timed.length ? Math.max(...timed) : null;
  const rows: { label: string; c: string; done: boolean; act: () => void }[] = [
    { label: answered >= nq ? 'Evening pulse, done' : answered ? `Evening pulse · ${nq - answered} left` : 'Evening pulse', c: GOLD, done: answered >= nq, act: onPulse },
    { label: 'Tonight’s question', c: SEPIA, done: pastDays.has(today), act: () => go('past') },
    ...(inbox ? [{ label: `Sort ${inbox} inbox idea${inbox > 1 ? 's' : ''}`, c: CRIMSON, done: false, act: () => go('future') }] : []),
    { label: lastMin === null ? 'Log the day so far' : `Log anything after ${fmtMin(lastMin, true).replace(/m$/, '')}`, c: GOLD, done: false, act: () => go('present') },
  ];

  const wk = Array.from({ length: 7 }, (_, i) => { const d = new Date(); d.setDate(d.getDate() - i); return dstr(d); });
  const wkLoad = wk.reduce((a, d) => a + (state.days[d]?.events.filter(e => e.type === 'training').length ?? 0), 0);
  const wkRest = wk.reduce((a, d) => a + (state.days[d]?.events.filter(e => e.type === 'recovery').length ?? 0), 0);
  const wkPast = wk.filter(d => pastDays.has(d)).length;
  const motto = state.mottos.length ? state.mottos[Math.floor(Date.now() / 864e5) % state.mottos.length] : 'Small, steady, and kind.';
  const h = now.getHours(), greet = h < 5 ? 'late night' : h < 12 ? 'good morning' : h < 17 ? 'good afternoon' : 'good evening';

  const sd = sel ? state.days[sel] : null;
  const selPast = sel ? past.filter(p => p.day === sel) : [];
  const selFut = sel ? items.filter(i => i.kind === 'future' && i.day === sel) : [];
  const selVals = sd ? Object.values(sd.answers) : [];
  const selAvg = selVals.length ? (selVals.reduce((a, b) => a + b, 0) / selVals.length).toFixed(1) : null;

  return (
    <div className="screen">
      <svg style={{ position: 'absolute', left: 0, top: -110, width: '100%', height: 360, pointerEvents: 'none', zIndex: 0 }} viewBox="0 0 393 360" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <Pencil d="M-30 280 C 70 202, 150 292, 240 208 S 360 122, 430 132" />
        <Belt d="M-30 296 C 80 236, 170 306, 260 232 S 370 156, 430 166" c={GOLD} w={9} o={.32} />
        <Belt d="M-30 252 C 60 174, 160 254, 230 174 S 350 94, 430 90" c={CRIMSON} w={3.5} o={.3} stitch={false} />
        <Fly x={300} y={110} s={.75} c={SEPIA} o={.75} st="outline" /><Fly x={356} y={124} s={.4} c={SEPIA} o={.5} st="outline" d={1} />
        <Fly x={332} y={84} s={.55} c={INK} o={.55} d={2} /><Fly x={228} y={128} s={.32} c={INK} o={.35} d={.4} />
        <Fly x={270} y={84} s={.45} c={SKY} o={.85} st="glow" d={1.4} />
      </svg>

      <div style={{ position: 'relative' }}>
        <div className="caps">{now.toLocaleDateString('en', { weekday: 'long' })} · {greet}</div>
        <div className="it" style={{ fontSize: 21, lineHeight: 1.35, marginTop: 14, maxWidth: 290 }}>“{motto.replace(/[.”"]+$/, '')}.”</div>
        <div style={{ display: 'flex', gap: 16, fontSize: 11.5, color: INK2, marginTop: 14 }}>
          <span><b style={{ color: EMBER }}>{wkLoad}</b> load</span><span><b style={{ color: SKY }}>{wkRest}</b> rest</span>
          <span><b style={{ color: SEPIA }}>{wkPast}</b>/7 written</span><span><b style={{ color: CRIMSON }}>{inbox}</b> to sort</span>
        </div>
      </div>

      <div style={{ position: 'relative', marginTop: 22 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: -8 }}>
            <button className="press" aria-label="Previous month" onClick={() => shift(-1)} style={{ width: 28, height: 30, color: INK2, fontSize: 17 }}>‹</button>
            <span className="serif" style={{ fontSize: 18 }}>{first.toLocaleString('en', { month: 'long' })}{ym.y !== now.getFullYear() ? ` ${ym.y}` : ''}</span>
            <button className="press" aria-label="Next month" onClick={() => shift(1)} style={{ width: 28, height: 30, color: INK2, fontSize: 17 }}>›</button>
          </span>
          <span style={{ display: 'flex', gap: 10, fontSize: 10, color: INK2 }}>
            {(['past', 'present', 'future'] as const).map(k => <span key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}><i style={{ width: 5, height: 5, borderRadius: 3, background: DOT[k] }} />{k}</span>)}
          </span>
        </div>
        <div className="cal" style={{ marginTop: 4 }}>
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((x, i) => <div key={i} className="caps" style={{ textAlign: 'center', fontSize: 8.5, paddingBottom: 4 }}>{x}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={i} />;
            const f = flags(d), fut = d > today;
            return (
              <button key={d} className={`day ${d === today ? 'today' : ''} ${d === sel ? 'sel' : ''}`} onClick={() => setSel(d === sel ? null : d)} disabled={fut} style={{ opacity: fut ? .35 : 1 }} aria-label={fromDstr(d).toDateString()}>
                <span className="n">{+d.slice(8)}</span>
                <span className="d">{(['past', 'present', 'future'] as const).map(k => <i key={k} style={{ background: f[k] ? DOT[k] : 'rgba(43,50,71,.10)' }} />)}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="grow" />

      {sel ? (
        <div key={sel} className="slip" style={{ position: 'relative', padding: '12px 14px', animation: 'enter .3s both', maxHeight: 210, overflow: 'hidden' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="it" style={{ fontSize: 17 }}>{fromDstr(sel).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <button className="press" onClick={() => setSel(null)} style={{ fontSize: 12, color: INK2, padding: 4 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12.5, marginTop: 6, color: INK2 }}>
            <span><b style={{ color: EMBER }}>{sd?.events.filter(e => e.type === 'training').length ?? 0}</b> load</span>
            <span><b style={{ color: SKY }}>{sd?.events.filter(e => e.type === 'recovery').length ?? 0}</b> rest</span>
            <span><b style={{ color: GOLD }}>{sd?.events.filter(e => e.type === 'win').length ?? 0}</b> wins</span>
            <span style={{ marginLeft: 'auto' }}>pulse <b className="serif" style={{ color: INK }}>{selAvg ?? '—'}</b></span>
          </div>
          {selPast[0] && <div className="it" style={{ fontSize: 14, lineHeight: 1.5, marginTop: 8, color: '#3A4156', display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>“{selPast[0].body.split('\n').filter(Boolean).join('. ')}”</div>}
          {selFut.slice(0, 2).map(i => <div key={i.id} style={{ fontSize: 13, marginTop: 6 }}><span style={{ color: CRIMSON }}>✦ </span>{i.body.slice(0, 80)}</div>)}
          {!selPast.length && !sd && !selFut.length && <div className="it mute" style={{ fontSize: 14, marginTop: 8 }}>A quiet day in the record.</div>}
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div className="caps" style={{ marginBottom: 2 }}>tonight</div>
          {rows.map(r => (
            <button key={r.label} className="todo" onClick={r.act}>
              <span className="ring-box" style={{ boxShadow: `inset 0 0 0 1.3px ${r.c}`, background: r.done ? r.c : 'transparent' }}>
                {r.done && <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true"><path d="M2 5.2 L4.2 7.2 L8 2.8" stroke="#fff" strokeWidth="1.6" fill="none" /></svg>}
              </span>
              <span className={r.done ? '' : 'it'} style={{ fontSize: 16, flex: 1, opacity: r.done ? .4 : 1, textDecoration: r.done ? 'line-through' : 'none' }}>{r.label}</span>
              <span style={{ color: INK2, fontSize: 16 }}>›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
