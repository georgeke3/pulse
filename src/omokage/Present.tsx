import { useMemo, useRef, useState } from 'react';
import { useApp } from '../store';
import type { EventType } from '../types';
import { SKINS, fmtMin, roundHalfHour, todayStr } from './skins';

const S = SKINS.present;
const TYPES: { t: EventType; label: string }[] = [{ t: 'training', label: 'Load' }, { t: 'recovery', label: 'Rest' }, { t: 'win', label: 'Win' }];
const STEP_Y = 26, STEP_X = 22;

export const Present = ({ onPulse }: { onPulse: () => void }) => {
  const { state, addEvent, deleteEvent } = useApp();
  const [type, setType] = useState<EventType>('training');
  const [cat, setCat] = useState<string | null>(null);
  const today = todayStr();
  const events = state.days[today]?.events ?? [];
  const cats = type === 'win' ? ['Win'] : state.config.categories[type === 'training' ? 'training' : 'recovery'];
  const chosen = cat && cats.includes(cat) ? cat : null;

  // default time = previous instance of this category today, else now
  const defMin = useMemo(() => {
    const prev = [...events].reverse().find(e => e.category === chosen && typeof e.custom_data?.time === 'string');
    if (prev) { const [h, m] = (prev.custom_data.time as string).split(':').map(Number); return h * 60 + m; }
    return roundHalfHour();
  }, [events, chosen]);

  const [drag, setDrag] = useState<{ min: number; val: number } | null>(null);
  const st = useRef<{ x: number; y: number; min: number; val: number } | null>(null);
  const anchors = state.config.scales[type === 'recovery' ? 'recovery' : 'training'].objective;
  const label = (v: number) => anchors.find(a => a.value === v)?.label ?? '';

  const down = (e: React.PointerEvent) => {
    if (!chosen) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    st.current = { x: e.clientX, y: e.clientY, min: defMin, val: 5 };
    setDrag({ min: defMin, val: 5 });
  };
  const move = (e: React.PointerEvent) => {
    const s = st.current; if (!s) return;
    const dy = Math.round((s.y - e.clientY) / STEP_Y);       // up = later
    const dx = Math.round((e.clientX - s.x) / STEP_X);       // right = more intense
    setDrag({ min: s.min + dy * 30, val: Math.max(1, Math.min(10, 5 + dx)) });
  };
  const up = () => {
    if (!st.current || !drag || !chosen) { st.current = null; setDrag(null); return; }
    const obj = type === 'win' ? 5 : drag.val;
    const h = Math.floor((((drag.min % 1440) + 1440) % 1440) / 60), m = (((drag.min % 60) + 60) % 60);
    addEvent(today, {
      type, category: chosen, objectiveIntensity: obj, intensity: Math.max(1, Math.min(4, Math.ceil(obj / 2.5))),
      duration: '<1h', custom_data: { time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}` }, date: today,
    });
    if (navigator.vibrate) navigator.vibrate(10);
    st.current = null; setDrag(null);
  };

  const shown = drag ?? { min: defMin, val: 5 };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: '14px 16px 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {TYPES.map(x => (
            <button key={x.t} onClick={() => { setType(x.t); setCat(null); }} style={{ ...pill(type === x.t), }}>{x.label}</button>
          ))}
        </div>
        <button onClick={onPulse} style={{ ...pill(false), borderColor: S.accent, color: S.accent }}>Pulse ✦</button>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {cats.map(c => <button key={c} onClick={() => setCat(c)} style={chip(chosen === c)}>{c}</button>)}
      </div>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14 }}>
        <div style={{ textAlign: 'center', minHeight: 64, color: S.ink }}>
          {chosen ? (
            <>
              <div style={{ fontSize: 26 }}>{fmtMin(shown.min)}</div>
              {type !== 'win' && <div style={{ fontSize: 14, color: S.mute }}>{shown.val}/10 · {label(shown.val)}</div>}
            </>
          ) : <div style={{ color: S.mute, fontSize: 14 }}>pick a category,<br />then hold the medallion</div>}
        </div>
        <div
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          style={{ width: 150, height: 150, borderRadius: '50%', touchAction: 'none', userSelect: 'none', display: 'grid', placeItems: 'center',
            background: chosen ? `radial-gradient(circle at 35% 30%, #f6edd4, ${S.accent})` : '#e3d6b2',
            border: `4px solid ${S.accent}`, boxShadow: drag ? `0 0 0 10px ${S.accent}33` : '0 4px 14px #0002', transition: 'box-shadow .15s', color: S.ink, fontSize: 15 }}>
          {chosen ? (drag ? '' : `${chosen}`) : '·'}
        </div>
        <div style={{ fontSize: 12, color: S.mute }}>↕ time (30 min) · ↔ intensity</div>
      </div>

      <div style={{ paddingBottom: 8 }}>
        {events.slice(-3).reverse().map(e => (
          <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 2px', borderTop: `1px solid ${S.line}66`, fontSize: 14, color: S.ink }}>
            <span>{typeof e.custom_data?.time === 'string' ? e.custom_data.time + ' · ' : ''}{e.category} <span style={{ color: S.mute }}>{e.type === 'win' ? '' : e.objectiveIntensity}</span></span>
            <button onClick={() => deleteEvent(today, e.id)} style={{ background: 'none', border: 0, color: S.mute, fontSize: 18, padding: '0 6px' }} aria-label="remove">×</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const pill = (on: boolean): React.CSSProperties => ({ padding: '7px 14px', borderRadius: 999, border: `1.5px solid ${S.accent}`, background: on ? S.accent : 'transparent', color: on ? '#fff' : S.ink, fontSize: 14, fontFamily: 'inherit' });
const chip = (on: boolean): React.CSSProperties => ({ padding: '6px 11px', borderRadius: 10, border: `1px solid ${S.line}`, background: on ? S.ink : S.card, color: on ? '#fff' : S.ink, fontSize: 13, fontFamily: 'inherit' });
