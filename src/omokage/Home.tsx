import { useState } from 'react';
import { useApp } from '../store';
import { useItems } from './items';
import { DOT, SKINS, todayStr } from './skins';

const S = SKINS.home;
const p2 = (n: number) => String(n).padStart(2, '0');
export const Home = () => {
  const { state } = useApp();
  const { items } = useItems();
  const now = new Date();
  const [ym, setYm] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [sel, setSel] = useState(todayStr());
  const first = new Date(ym.y, ym.m, 1);
  const dim = new Date(ym.y, ym.m + 1, 0).getDate();
  const cells: (string | null)[] = Array(first.getDay()).fill(null);
  for (let d = 1; d <= dim; d++) cells.push(`${ym.y}-${p2(ym.m + 1)}-${p2(d)}`);
  const has = (d: string) => ({
    past: items.some(i => i.kind === 'past' && i.day === d) || !!state.days[d]?.note?.trim(),
    present: (state.days[d]?.events.length ?? 0) > 0,
    future: items.some(i => i.kind === 'future' && i.day === d),
  });
  const shift = (n: number) => setYm(({ y, m }) => { const t = new Date(y, m + n, 1); return { y: t.getFullYear(), m: t.getMonth() }; });
  const day = state.days[sel];
  const load = day?.events.filter(e => e.type === 'training').length ?? 0;
  const rest = day?.events.filter(e => e.type === 'recovery').length ?? 0;
  const wins = day?.events.filter(e => e.type === 'win').length ?? 0;
  const ans = day ? Object.values(day.answers) : [];
  const pulse = ans.length ? (ans.reduce((a, b) => a + b, 0) / ans.length).toFixed(1) : '–';
  const dayItems = items.filter(i => i.day === sel);

  return (
    <div style={{ padding: '14px 16px 0', color: S.ink, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ textAlign: 'center', letterSpacing: '0.3em', fontSize: 13, color: S.mute }}>OMOKAGE · 面影</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '8px 0' }}>
        <button onClick={() => shift(-1)} style={nav}>‹</button>
        <div style={{ fontSize: 18 }}>{first.toLocaleString('en', { month: 'long', year: 'numeric' })}</div>
        <button onClick={() => shift(1)} style={nav}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, textAlign: 'center', fontSize: 12, color: S.mute }}>
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <div key={i}>{d}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={i} />;
          const h = has(d); const isSel = d === sel;
          return (
            <button key={d} onClick={() => setSel(d)} style={{ height: 42, border: isSel ? `1.5px solid ${S.accent}` : '1.5px solid transparent', borderRadius: 10, background: d === todayStr() ? S.card : 'transparent', color: S.ink, fontFamily: 'inherit', fontSize: 14, padding: 0 }}>
              <div>{+d.slice(8)}</div>
              <div style={{ display: 'flex', gap: 2, justifyContent: 'center', marginTop: 2, height: 5 }}>
                {(['past', 'present', 'future'] as const).map(k => <i key={k} style={{ width: 5, height: 5, borderRadius: 5, background: h[k] ? DOT[k] : 'transparent' }} />)}
              </div>
            </button>
          );
        })}
      </div>
      <div style={{ marginTop: 12, background: S.card, border: `1px solid ${S.line}`, borderRadius: 16, padding: '10px 14px', flex: 1, overflowY: 'auto' }}>
        <div style={{ fontSize: 12, color: S.mute }}>{sel}</div>
        <div style={{ display: 'flex', justifyContent: 'space-between', margin: '6px 0 8px', fontSize: 15 }}>
          <span>Load <b>{load}</b></span><span>Rest <b>{rest}</b></span><span>Wins <b>{wins}</b></span><span>Pulse <b>{pulse}</b></span>
        </div>
        {dayItems.slice(0, 4).map(i => <div key={i.id} style={{ fontSize: 14, padding: '3px 0', borderTop: `1px solid ${S.line}66` }}><i style={{ color: DOT[i.kind], fontStyle: 'normal' }}>● </i>{i.body.slice(0, 80)}</div>)}
        {day?.note?.trim() && <div style={{ fontSize: 14, padding: '3px 0', borderTop: `1px solid ${S.line}66` }}><i style={{ color: DOT.past, fontStyle: 'normal' }}>● </i>{day.note.slice(0, 80)}</div>}
      </div>
    </div>
  );
};
const nav: React.CSSProperties = { background: 'none', border: 0, fontSize: 26, color: '#8b8794', padding: '0 12px' };
