import { useState } from 'react';
import type { Event } from '../types';
import { useStimuli } from './stimuli';
import { RIM, durLabel } from './LogSheet';
import { CRIMSON, INK, INK2, fmtMin, parseHM } from './skins';

export const evStart = (e: Event) => parseHM(e.custom_data?.time);
export const evDurH = (e: Event): number | null => (typeof e.custom_data?.durationH === 'number' ? e.custom_data.durationH : null);
const when = (e: Event) => {
  const s = evStart(e); if (s === null) return 'no time';
  const d = evDurH(e);
  return d ? `${fmtMin(s)} – ${fmtMin(s + d * 60)}` : fmtMin(s);
};
const Art = ({ e, s }: { e: Event; s: number }) => {
  const src = useStimuli().art(e.type, e.category), [rim, fill] = RIM[e.type];
  return (
    <span style={{ width: s, height: s, borderRadius: '50%', flex: 'none', display: 'grid', placeItems: 'center', background: fill, boxShadow: `inset 0 0 0 1.5px ${rim}` }}>
      {src ? <img src={src} alt="" draggable={false} style={{ width: s * .84, height: s * .84 }} /> : <b style={{ color: rim }}>{e.category[0]}</b>}
    </span>
  );
};
const level = (e: Event) => (e.type === 'win' ? '' : `${Math.round(e.objectiveIntensity)}`);

/** One logged instance: what, when, how long, how hard, with edit and delete. */
export const EventCard = ({ e, anchorLabel, onEdit, onDelete, onClose }: { e: Event; anchorLabel?: string; onEdit: () => void; onDelete: () => void; onClose: () => void }) => {
  const [sure, setSure] = useState(false);
  const rim = RIM[e.type][0], d = evDurH(e);
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="card-sheet" role="dialog" aria-label={`${e.category} instance`}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Art e={e} s={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="caps" style={{ color: rim }}>{e.type === 'training' ? 'load' : e.type === 'recovery' ? 'rest' : 'win'}</div>
            <div className="serif" style={{ fontSize: 26, lineHeight: 1.15 }}>{e.category}</div>
          </div>
          {e.type !== 'win' && <div style={{ textAlign: 'right' }}><div className="serif" style={{ fontSize: 30, color: rim, lineHeight: 1 }}>{level(e)}</div><div className="caps" style={{ fontSize: 8.5, marginTop: 4 }}>of 10</div></div>}
        </div>
        <div className="it" style={{ fontSize: 17, marginTop: 14 }}>{when(e)}</div>
        {(d || anchorLabel) && <div style={{ fontSize: 12.5, color: INK2, marginTop: 4 }}>{[d ? durLabel(d) : '', anchorLabel ?? ''].filter(Boolean).join(' · ')}</div>}
        {e.notes && <div className="it" style={{ fontSize: 16, marginTop: 12, lineHeight: 1.45, color: '#3A4156' }}>{e.notes}</div>}
        <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
          <button className="chip press" style={{ height: 48, flex: 1, color: sure ? '#fff' : CRIMSON, background: sure ? CRIMSON : 'rgba(255,255,255,.35)', boxShadow: sure ? 'none' : `inset 0 0 0 1px ${CRIMSON}66` }}
            onClick={() => (sure ? onDelete() : setSure(true))}>{sure ? 'Tap again to delete' : 'Delete'}</button>
          <button className="chip on press" style={{ height: 48, flex: 1.4, fontSize: 15 }} onClick={onEdit}>Edit</button>
        </div>
      </div>
    </>
  );
};

/** Everything logged today, newest hour last; tap a row to open it. */
export const TodayList = ({ events, onOpen, onClose }: { events: Event[]; onOpen: (id: string) => void; onClose: () => void }) => {
  const sorted = [...events].sort((a, b) => (evStart(a) ?? 1e4) - (evStart(b) ?? 1e4));
  return (
    <>
      <div className="backdrop" onClick={onClose} />
      <div className="card-sheet" style={{ maxHeight: '72%' }} role="dialog" aria-label="Today's instances">
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', paddingBottom: 6 }}>
          <span className="serif" style={{ fontSize: 24 }}>Today</span>
          <span className="caps">{events.length} logged</span>
        </div>
        <div style={{ overflowY: 'auto', WebkitOverflowScrolling: 'touch', minHeight: 0 }}>
          {sorted.length === 0 && <div className="it" style={{ color: INK2, padding: '18px 0', fontSize: 15 }}>Nothing yet. Tap a circle to log.</div>}
          {sorted.map(e => (
            <button key={e.id} className="irow press" onClick={() => onOpen(e.id)}>
              <Art e={e} s={40} />
              <span style={{ flex: 1, minWidth: 0 }}>
                <span className="serif" style={{ fontSize: 18, display: 'block' }}>{e.category}</span>
                <span style={{ fontSize: 12, color: INK2 }}>{when(e)}{evDurH(e) ? ` · ${evDurH(e)}h` : ''}</span>
              </span>
              {e.type !== 'win' && <span className="serif" style={{ fontSize: 20, color: RIM[e.type][0] }}>{level(e)}</span>}
              <span style={{ color: INK2, fontSize: 16 }}>›</span>
            </button>
          ))}
        </div>
        <button className="chip press" style={{ height: 46, marginTop: 10, color: INK }} onClick={onClose}>Close</button>
      </div>
    </>
  );
};
