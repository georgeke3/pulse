import { Sym, TabMark } from './Sym';
import { useNavState } from './nav';
import { useApp } from '../store';
import { Belt, Fly, Pencil } from './Art';
import { useItems } from './items';
import { useAnswers } from './qa';
import { useTodos } from './todos';
import { sideTotal } from './load';
import { isStim } from './special';
import { useCircle, useSwipe } from './swipe';
import { MottoEditor } from './MottoEditor';
import { DayFull } from './DayFull';
import { haptic } from './haptics';
import { CRIMSON, DOT, EMBER, GOLD, INK, INK2, SEPIA, SKY, dayNow, dstr, fromDstr, todayStr, type Mode } from './skins';

export const Home = ({ go, onPulse }: { go: (m: Mode, patch?: Record<string, unknown>) => void; onPulse: (day?: string) => void }) => {
  const { state } = useApp();
  const { items } = useItems();
  const answers = useAnswers();
  const now = dayNow(), today = todayStr();
  const [ym, setYm] = useNavState('home.ym', { y: now.getFullYear(), m: now.getMonth() }, 'replace');
  const [sel, setSel] = useNavState<string | null>('home.sel', null, 'replace');
  const [more, setMore] = useNavState('home.more', false);
  const [mottos, setMottos] = useNavState('home.mottos', false);
  const [full, setFull] = useNavState<string | null>('home.full', null);
  const circle = useCircle(() => { haptic(18); setMottos(true); }, () => haptic(5));
  const first = new Date(ym.y, ym.m, 1), dim = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (string | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= dim; d++) cells.push(dstr(new Date(ym.y, ym.m, d)));
  const ansDays = new Set(answers.map(p => p.day));
  const pastDays = new Set([...ansDays, ...Object.keys(state.days).filter(d => state.days[d]?.note?.trim())]);
  const futDays = new Set(items.filter(i => i.kind === 'future' && i.board !== '__trash').map(i => i.day));
  const flags = (d: string) => ({ past: pastDays.has(d), present: (state.days[d]?.events.length ?? 0) > 0 || Object.keys(state.days[d]?.answers ?? {}).length > 0, future: futDays.has(d) });
  const shift = (n: number) => {
    const t = new Date(ym.y, ym.m + n, 1);
    if (t > now) return;                                       // nothing to see in future months
    setSel(null); setYm({ y: t.getFullYear(), m: t.getMonth() });
  };
  const step = (n: number) => {                                // the open day card: previous / next day, never past today
    if (!sel) return;
    const t = fromDstr(sel); t.setDate(t.getDate() + n);
    const k = dstr(t); if (k > today) return;
    setSel(k); setYm({ y: t.getFullYear(), m: t.getMonth() });
  };
  const calSwipe = useSwipe(() => shift(1), () => shift(-1));
  const cardSwipe = useSwipe(() => step(1), () => step(-1));

  const { critical, optional, due, inbox } = useTodos(go, onPulse);

  const wk = Array.from({ length: 7 }, (_, i) => { const d = dayNow(); d.setDate(d.getDate() - i); return dstr(d); });
  const logged = wk.filter(d => (state.days[d]?.events ?? []).some(e => isStim(e.type)));
  const avg = (t: 'training' | 'recovery') => (logged.length ? Math.round(logged.reduce((a, d) => a + sideTotal(state.days[d].events, t), 0) / logged.length) : 0);
  const wkLoad = avg('training'), wkRest = avg('recovery');
  const wkPast = wk.filter(d => pastDays.has(d)).length;
  const motto = state.mottos.length ? state.mottos[Math.floor(Date.now() / 864e5) % state.mottos.length] : 'Small, steady, and kind.';
  const h = new Date().getHours(), greet = h < 5 ? 'late night' : h < 12 ? 'good morning' : h < 17 ? 'good afternoon' : 'good evening';

  const sd = sel ? state.days[sel] : null;
  const selAns = sel ? answers.filter(p => p.day === sel) : [];
  const selEv = [...(sd?.events ?? [])].sort((a, b) => String(a.custom_data?.time ?? '').localeCompare(String(b.custom_data?.time ?? '')));
  const selFut = sel ? items.filter(i => i.kind === 'future' && i.board !== '__trash' && i.day === sel) : [];
  const selVals = sd ? Object.values(sd.answers) : [];
  const selAvg = selVals.length ? (selVals.reduce((a, b) => a + b, 0) / selVals.length).toFixed(1) : null;

  if (full) return <DayFull day={full} go={go} onPulse={onPulse} />;

  if (more) {
    return (
      <div className="screen" style={{ paddingBottom: 12, touchAction: 'pan-y' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 6 }}>
          <span className="it" style={{ fontSize: 20 }}>If you feel like it</span>
          <span className="caps">{optional.filter(r => !r.done).length} of {optional.length}</span>
        </div>
        <div className="scroll grow" style={{ margin: '6px -24px 0', padding: '0 24px 12px' }}>
          {optional.map(r => (
            <button key={r.label} className="todo" onClick={() => { setMore(false); r.act(); }} style={{ height: 52 }}>
              <span style={{ width: 26, display: 'grid', placeItems: 'center' }}><Sym n="wisp" on={r.done} s={18} o={r.done ? .9 : .6} /></span>
              <span className="it" style={{ fontSize: 16, flex: 1, opacity: r.done ? .5 : 1 }}>{r.label}</span>
              <span style={{ color: INK2, fontSize: 16, opacity: .6 }}>›</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`screen${due.length ? ' has-due' : ''}`}>
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
        <div className="it motto" {...circle} style={{ fontSize: motto.length > 120 ? 17 : motto.length > 70 ? 19 : 21, lineHeight: 1.35, marginTop: 14, maxWidth: 290, ...circle.style }}>“{motto.replace(/[.”"]+$/, '')}.”</div>
        <div className="home-stats" style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 16px', fontSize: 11.5, color: INK2, marginTop: 14, maxHeight: 36, overflow: 'hidden' }}>
          <span>avg <b style={{ color: EMBER }}>{wkLoad}%</b> load</span><span><b style={{ color: SKY }}>{wkRest}%</b> rest</span>
          <span><b style={{ color: SEPIA }}>{wkPast}</b>/7 written</span><span><b style={{ color: CRIMSON }}>{inbox}</b> to sort</span>
        </div>
      </div>

      <div {...calSwipe} className="home-cal" style={{ position: 'relative', marginTop: 22, ...calSwipe.style }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 2, marginLeft: -8 }}>
            <button className="press" aria-label="Previous month" onClick={() => shift(-1)} style={{ width: 28, height: 30, color: INK2, fontSize: 17 }}>‹</button>
            <span className="serif" style={{ fontSize: 18 }}>{first.toLocaleString('en', { month: 'long' })}{ym.y !== now.getFullYear() ? ` ${ym.y}` : ''}</span>
            <button className="press" aria-label="Next month" onClick={() => shift(1)} style={{ width: 28, height: 30, color: INK2, fontSize: 17, opacity: ym.y === now.getFullYear() && ym.m === now.getMonth() ? .25 : 1 }}>›</button>
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
        <div key={sel} {...cardSwipe} className="slip" style={{ position: 'relative', padding: '12px 14px', animation: 'enter .3s both', maxHeight: 'clamp(170px, 25svh, 215px)', overflow: 'hidden', ...cardSwipe.style }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span className="it" style={{ fontSize: 17, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{fromDstr(sel).toLocaleDateString('en', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
            <button className="press" onClick={() => setSel(null)} style={{ fontSize: 12, color: INK2, padding: 4 }}>✕</button>
          </div>
          <div style={{ display: 'flex', gap: 14, fontSize: 12.5, marginTop: 6, color: INK2 }}>
            <span><b style={{ color: EMBER }}>{sideTotal(sd?.events ?? [], 'training')}%</b> load</span>
            <span><b style={{ color: SKY }}>{sideTotal(sd?.events ?? [], 'recovery')}%</b> rest</span>
            <span><b style={{ color: GOLD }}>{sd?.events.filter(e => e.type === 'win').length ?? 0}</b> wins</span>
            <span style={{ marginLeft: 'auto' }}>pulse <b className="serif" style={{ color: INK }}>{selAvg ?? '—'}</b></span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8, height: 44 }}>
            {([
              { k: 'answers', n: selAns.length, art: <TabMark m="past" />, act: () => go('past') },
              { k: 'logged', n: selEv.length, art: <TabMark m="present" />, act: () => go('present', sel && sel !== today ? { 'present.pday': sel } : {}) },
              { k: 'pins', n: selFut.length, art: <TabMark m="future" />, act: () => go('future') },
            ]).map(c => (
              <button key={c.k} className="press" onClick={c.act} aria-label={`${c.n} ${c.k}`} style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'center', opacity: c.n ? 1 : .38 }}>
                {c.art}
                <b className="serif" style={{ fontSize: 22, fontWeight: 400, color: INK }}>{c.n}</b>
              </button>
            ))}
            <button className="chip press" onClick={() => setFull(sel)} style={{ height: 34, flex: 'none', fontSize: 12.5, padding: '0 14px' }}>Full day ›</button>
          </div>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div className="caps" style={{ marginBottom: 2, color: INK }}>every day</div>
          {critical.map(r => (
            <button key={r.label} className="todo" onClick={r.act}>
              <Sym n="dragon" on={r.done} s={26} o={r.done ? 1 : .8} />
              <span className={r.done ? '' : 'it'} style={{ fontSize: 16, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', opacity: r.done ? .4 : 1, textDecoration: r.done ? 'line-through' : 'none' }}>{r.label}</span>
              <span style={{ color: INK2, fontSize: 16 }}>›</span>
            </button>
          ))}
          {due.map(r => (
            <button key={r.label} className="todo" onClick={r.act} aria-label={`Due: ${r.label}`}>
              <Sym n="dragon" on={false} s={26} o={.8} />
              <span className="it" style={{ fontSize: 15, flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.label}</span>
              {r.hint && <span className="caps" style={{ fontSize: 8.5, flex: 'none' }}>{r.hint}</span>}
              <span style={{ color: INK2, fontSize: 16 }}>›</span>
            </button>
          ))}
          <div className="caps" style={{ marginTop: 12, marginBottom: 0, opacity: .75 }}>if you feel like it</div>
          <button className="todo" onClick={() => setMore(true)} aria-label={`If you feel like it, ${optional.length} things`} style={{ height: 40, borderBottom: 0 }}>
            <span style={{ width: 26, display: 'grid', placeItems: 'center' }}><Sym n="wisp" on={optional.every(r => r.done)} s={16} o={.7} /></span>
            <span className="it" style={{ fontSize: 14, flex: 1, minWidth: 0, color: INK2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{optional.filter(r => !r.done).map(r => r.label).join(' · ') || 'All done'}</span>
            <span className="caps" style={{ fontSize: 9 }}>{optional.filter(r => !r.done).length} of {optional.length}</span>
            <span style={{ color: INK2, fontSize: 14, opacity: .6 }}>›</span>
          </button>
        </div>
      )}
      {mottos && <MottoEditor onClose={() => setMottos(false)} />}
    </div>
  );
};
