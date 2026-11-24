import { useMemo } from 'react';
import { useApp } from '../store';
import { ActionBar } from './Actions';
import { computeBalance, tone, type Balance } from './balanceMath';
import { Sheet } from './Sheet';
import { EMBER, INK, INK2, SKY, fromDstr, todayStr } from './skins';

/** Today's balance, live as events are logged. */
export const useBalance = (): Balance => {
  const { state } = useApp();
  const today = todayStr();
  return useMemo(() => computeBalance(state.days, today), [state.days, today]);
};

const colour = (score: number) => { const t = tone(score); return t === 'load' ? EMBER : t === 'rest' ? SKY : INK; };
export const signed = (n: number) => (n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0');

/** The small readout used on Home and Present: number + word, tap for the detail sheet. */
export const BalanceChip = ({ onOpen, align = 'right', fallback = null }: { onOpen: () => void; align?: 'left' | 'right'; fallback?: React.ReactNode }) => {
  const b = useBalance();
  if (!b.any) return <>{fallback}</>;
  return (
    <button className="press" onClick={onOpen} aria-label={`Balance ${signed(b.score)}, ${b.band.label}. Open details`}
      style={{ display: 'inline-flex', alignItems: 'baseline', gap: 6, textAlign: align, whiteSpace: 'nowrap', flex: 'none' }}>
      <b className="serif" style={{ fontSize: 17, fontWeight: 600, color: colour(b.score) }}>{signed(b.score)}</b>
      <span className="it" style={{ fontSize: 13.5, color: INK2 }}>{b.band.label.toLowerCase()}</span>
      <span style={{ color: INK2, opacity: .6, fontSize: 13 }}>›</span>
    </button>
  );
};

/** 14 days: bars are each day's net (rest above, load below the line), the line is the running balance. */
const Trend = ({ b }: { b: Balance }) => {
  const W = 345, H = 100, mid = H / 2, n = b.series.length, bw = W / n;
  const maxAbs = Math.max(60, ...b.series.map(s => Math.abs(s.net)), ...b.series.map(s => Math.abs(s.bal)));
  const y = (v: number) => mid - (v / maxAbs) * (mid - 6);
  const line = b.series.map((s, i) => `${i ? 'L' : 'M'}${(i * bw + bw / 2).toFixed(1)} ${y(s.bal).toFixed(1)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H + 16}`} style={{ width: '100%', display: 'block' }} role="img" aria-label="Last 14 days of balance">
      <line x1="0" x2={W} y1={mid} y2={mid} stroke={INK} strokeOpacity=".25" strokeWidth=".7" />
      {b.series.map((s, i) => {
        const h = Math.abs(y(s.net) - mid);
        return <rect key={s.day} x={i * bw + 4} width={bw - 8} y={s.net >= 0 ? mid - h : mid} height={Math.max(h, s.logged ? 1 : 0)} rx="2" fill={s.net >= 0 ? SKY : EMBER} opacity={s.assumed ? .3 : .55} />;
      })}
      <path d={line} fill="none" stroke={INK} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={(n - 1) * bw + bw / 2} cy={y(b.series[n - 1].bal)} r="3.4" fill={colour(b.score)} stroke="#fff" strokeWidth="1.2" />
      {b.series.map((s, i) => (i % 3 === 0 || i === n - 1) && <text key={s.day} x={i * bw + bw / 2} y={H + 11} textAnchor="middle" fontSize="9" fill={INK2}>{i === n - 1 ? 'today' : fromDstr(s.day).toLocaleDateString('en', { weekday: 'short' })}</text>)}
    </svg>
  );
};

const MixBar = ({ b }: { b: Balance }) => {
  const m = b.mix, seg = [
    { v: m.small, n: m.nSmall, label: 'small things', c: '#F0C9B2' }, { v: m.mid, n: m.nMid, label: 'in between', c: '#DC9970' }, { v: m.heavy, n: m.nHeavy, label: 'heavy hits', c: '#A9441F' },
  ];
  return (
    <div>
      {m.total > 0 && <div style={{ display: 'flex', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 }}>{seg.filter(x => x.v > 0).map(x => <span key={x.label} style={{ flex: x.v, background: x.c }} />)}</div>}
      {m.total > 0 && <div style={{ display: 'flex', gap: 14, marginTop: 7, fontSize: 11.5, color: INK2, flexWrap: 'wrap' }}>{seg.filter(x => x.n > 0).map(x => <span key={x.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}><i style={{ width: 8, height: 8, borderRadius: 4, background: x.c }} /><b style={{ color: INK }}>{x.n}</b> {x.label}</span>)}</div>}
      <div className="it" style={{ fontSize: 15, lineHeight: 1.4, marginTop: m.total > 0 ? 10 : 0 }}>{m.line}</div>
    </div>
  );
};

export const BalanceSheet = ({ onClose }: { onClose: () => void }) => {
  const b = useBalance();
  const loads = b.drivers.filter(d => d.side === 'load').slice(0, 3), rests = b.drivers.filter(d => d.side === 'rest' && d.name.toLowerCase() !== 'sleep').slice(0, 2);
  const assumedDays = b.series.filter(s => s.assumed).length;
  const when = (day: string) => day === todayStr() ? 'today' : fromDstr(day).toLocaleDateString('en', { weekday: 'short' });
  return (
    <Sheet mode="home">
      <div style={{ position: 'relative', textAlign: 'center', padding: '12px 22px 0' }}><span className="caps">Balance</span></div>
      <div className="scroll" style={{ position: 'relative', flex: 1, minHeight: 0, overflowY: 'auto', padding: '8px 24px 96px' }}>
        <div style={{ textAlign: 'center', padding: '10px 0 14px' }}>
          <div className="serif" style={{ fontSize: 76, lineHeight: 1, fontWeight: 500, color: colour(b.score), letterSpacing: '-.02em' }}>{signed(b.score)}</div>
          <div className="it" style={{ fontSize: 24, marginTop: 6 }}>{b.band.label}</div>
          <div style={{ fontSize: 13, color: INK2, marginTop: 6, maxWidth: 280, marginInline: 'auto', lineHeight: 1.4 }}>{b.band.line}</div>
        </div>
        <div className="caps" style={{ margin: '4px 0 6px' }}>Last 14 days</div>
        <Trend b={b} />
        <div style={{ display: 'flex', gap: 14, fontSize: 11, color: INK2, marginTop: 2 }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: SKY, opacity: .7 }} />rest beat load</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><i style={{ width: 8, height: 8, borderRadius: 2, background: EMBER, opacity: .7 }} />load beat rest</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}><i style={{ width: 12, height: 2, background: INK }} />balance</span>
        </div>

        <div className="caps" style={{ margin: '22px 0 8px' }}>What your load was made of</div>
        <MixBar b={b} />

        {(loads.length > 0 || rests.length > 0) && <>
          <div className="caps" style={{ margin: '22px 0 4px' }}>Weighing on you most</div>
          {loads.map((d, i) => <Row key={`l${i}`} when={when(d.day)} name={d.name} v={`${d.pct}% load`} c={EMBER} />)}
          {rests.length > 0 && <div className="caps" style={{ margin: '14px 0 4px' }}>Helping most</div>}
          {rests.map((d, i) => <Row key={`r${i}`} when={when(d.day)} name={d.name} v={`${d.pct}% rest`} c={SKY} />)}
        </>}

        <div style={{ marginTop: 22, fontSize: 11.5, lineHeight: 1.5, color: INK2 }}>
          Each day: rest (last night’s sleep included) minus load. Yesterday’s balance carries over, fading about a quarter a day, and surplus tops out at +100.
          {assumedDays > 0 && ` Sleep wasn’t logged on ${assumedDays} recent day${assumedDays === 1 ? '' : 's'}, so I assumed 60%.`}
        </div>
      </div>
      <ActionBar cancel="Close" onCancel={onClose} />
    </Sheet>
  );
};

const Row = ({ when, name, v, c }: { when: string; name: string; v: string; c: string }) => (
  <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(43,50,71,.08)' }}>
    <span className="caps" style={{ width: 44, flex: 'none' }}>{when}</span>
    <span className="it" style={{ flex: 1, fontSize: 16, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{name}</span>
    <b style={{ fontSize: 13, color: c, fontWeight: 600 }}>{v}</b>
  </div>
);
