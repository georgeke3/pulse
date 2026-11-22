import { useApp } from '../store';
import { ActionBar, Back } from './Actions';
import { Art, evOrder, evStart } from './Instances';
import { useItems } from './items';
import { loadOf, sideTotal, heat } from './load';
import { pulseWord } from './Pulse';
import { useAnswers } from './qa';
import { useBackSwipe } from './swipe';
import { fmtMin, fromDstr, CRIMSON, EMBER, GOLD, INK, INK2, SEPIA, SKY, type Mode } from './skins';

const Meter = ({ label, pct, color }: { label: string; pct: number; color: string }) => (
  <div style={{ flex: 1, minWidth: 0 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
      <span className="caps">{label}</span><b className="serif" style={{ fontSize: 22, color }}>{pct}%</b>
    </div>
    <div style={{ height: 6, borderRadius: 3, background: 'rgba(43,50,71,.08)', marginTop: 6, overflow: 'hidden' }}>
      <i style={{ display: 'block', height: '100%', width: `${Math.min(100, pct)}%`, background: color, borderRadius: 3 }} />
    </div>
  </div>
);
const Sec = ({ t, children }: { t: string; children: React.ReactNode }) => <section style={{ marginTop: 22 }}><div className="caps" style={{ marginBottom: 6 }}>{t}</div>{children}</section>;

/** The whole day on one page, with a way out to each tab. Nested inside Home (Back, not Close). */
export const DayFull = ({ day, go, onBack }: { day: string; go: (m: Mode, d?: string) => void; onBack: () => void }) => {
  const { state } = useApp();
  const { items } = useItems();
  const answers = useAnswers();
  const swipe = useBackSwipe(onBack);
  const sd = state.days[day], d = fromDstr(day);
  const events = [...(sd?.events ?? [])].sort((a, b) => (evOrder(a) ?? 1e4) - (evOrder(b) ?? 1e4));
  const stim = events.filter(e => e.type !== 'win'), wins = events.filter(e => e.type === 'win');
  const vals = Object.values(sd?.answers ?? {}), avg = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  const note = sd?.note?.trim() ?? '', ans = answers.filter(a => a.day === day);
  const fut = items.filter(i => i.kind === 'future' && i.board !== '__trash' && i.day === day);
  const empty = !stim.length && !wins.length && !note && !ans.length && !fut.length && avg === null;
  return (
    <div className="screen" style={{ paddingBottom: 12, touchAction: 'pan-y' }} {...swipe}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', paddingBottom: 4 }}>
        <Back label="Home" onBack={onBack} />
        <span className="caps">{d.toLocaleDateString('en', { year: 'numeric' })}</span>
      </div>
      <div className="scroll grow" style={{ margin: '0 -24px', padding: '0 24px 12px', WebkitMaskImage: 'linear-gradient(to bottom, #000 calc(100% - 28px), transparent 100%)', maskImage: 'linear-gradient(to bottom, #000 calc(100% - 28px), transparent 100%)' }}>
        <div className="serif" style={{ fontSize: 40, lineHeight: 1.05, letterSpacing: '-.01em' }}>{d.toLocaleDateString('en', { weekday: 'long' })}</div>
        <div className="it" style={{ fontSize: 18, color: INK2, marginTop: 2 }}>{d.toLocaleDateString('en', { day: 'numeric', month: 'long' })}</div>

        <div style={{ display: 'flex', gap: 22, marginTop: 22 }}>
          <Meter label="load" pct={sideTotal(events, 'training')} color={EMBER} />
          <Meter label="rest" pct={sideTotal(events, 'recovery')} color={SKY} />
        </div>
        <div style={{ display: 'flex', gap: 22, marginTop: 16, alignItems: 'baseline' }}>
          <span><b className="serif" style={{ fontSize: 22, color: GOLD }}>{wins.length}</b> <span style={{ fontSize: 12, color: INK2 }}>win{wins.length === 1 ? '' : 's'}</span></span>
          {avg !== null && <span><b className="serif" style={{ fontSize: 22 }}>{avg.toFixed(1)}</b> <span style={{ fontSize: 12, color: INK2 }}>pulse · {pulseWord(avg)}</span></span>}
        </div>

        {stim.length > 0 && (
          <Sec t="the day">
            {stim.map(e => (
              <button key={e.id} className="todo press" onClick={() => go('present', day)} style={{ height: 54 }}>
                <Art e={e} s={36} />
                <span style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                  <span className="serif" style={{ fontSize: 16, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{e.category}</span>
                  <span style={{ fontSize: 11.5, color: INK2 }}>{evStart(e) != null ? fmtMin(evStart(e)!, true) : 'no time'}{loadOf(e) != null ? ` · ${loadOf(e)}%` : ''} · intensity {Math.round(e.objectiveIntensity)}</span>
                </span>
                <i style={{ width: 9, height: 9, borderRadius: 5, flex: 'none', background: heat(e.type === 'recovery' ? 'recovery' : 'training', e.objectiveIntensity || 1) }} />
              </button>
            ))}
          </Sec>
        )}
        {note && <Sec t="the day, told"><div className="it" style={{ fontSize: 16, lineHeight: 1.55, color: '#3A4156', whiteSpace: 'pre-wrap' }}>{note}</div></Sec>}
        {ans.length > 0 && (
          <Sec t="asked & answered">
            {ans.map(a => (
              <div key={a.id} style={{ marginBottom: 12 }}>
                <div className="it" style={{ fontSize: 15, color: SEPIA }}>{a.question}</div>
                <div style={{ fontSize: 14.5, lineHeight: 1.5, marginTop: 2, whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{a.body}</div>
              </div>
            ))}
          </Sec>
        )}
        {fut.length > 0 && (
          <Sec t="set aside for later">
            {fut.map(i => <div key={i.id} style={{ fontSize: 14, lineHeight: 1.45, marginBottom: 6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}><span style={{ color: CRIMSON }}>✦ </span>{i.body}</div>)}
          </Sec>
        )}
        {empty && <div className="it mute" style={{ fontSize: 15, marginTop: 24 }}>A quiet day in the record.</div>}

        <Sec t="go to">
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="chip press" onClick={() => go('present', day)} style={{ height: 40, color: INK }}>Present ›</button>
            <button className="chip press" onClick={() => go('past')} style={{ height: 40, color: INK }}>Past ›</button>
            <button className="chip press" onClick={() => go('future')} style={{ height: 40, color: INK }}>Future ›</button>
          </div>
        </Sec>
      </div>
      <ActionBar cancel="Home" h={48} onCancel={onBack} />
    </div>
  );
};
