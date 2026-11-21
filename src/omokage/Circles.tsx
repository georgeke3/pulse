import { useState } from 'react';
import { ICONS, iconSrc } from './icons';
import { haptic } from './haptics';
import { Sheet } from './Sheet';
import { RIM } from './LogSheet';
import { INK2 } from './skins';
import { labelOf, monoOf, useStimuli, type StimType, type Stimulus } from './stimuli';

const Face = ({ s, size }: { s: { icon: string; name: string; type: StimType }; size: number }) => {
  const [rim, fill] = RIM[s.type], src = iconSrc(s.icon);
  return (
    <span className="cface" style={{ width: size, height: size, background: fill, boxShadow: `inset 0 0 0 1.5px ${rim}`, color: rim }}>
      {src ? <img src={src} alt="" draggable={false} /> : <b>{monoOf(s.name)}</b>}
    </span>
  );
};

const TYPES: { t: StimType; title: string; hint: string }[] = [{ t: 'training', title: 'Load', hint: 'left side' }, { t: 'recovery', title: 'Rest', hint: 'right side' }];

/** Where you decide which circles live on the Present tab. Nothing is ever deleted; archiving hides a circle but its history stays. */
export const Circles = ({ onClose }: { onClose: () => void }) => {
  const st = useStimuli();
  const [edit, setEdit] = useState<{ id?: string; type: StimType } | null>(null);
  const [showArch, setShowArch] = useState(false);
  const archived = st.all.filter(s => s.archived);

  if (edit) return <Editor id={edit.id} type={edit.type} onClose={() => setEdit(null)} />;
  return (
    <Sheet mode="present" still>
      <div className="cm-head">
        <span className="serif" style={{ fontSize: 24 }}>Circles</span>
        <button className="chip on press" onClick={onClose}>Done</button>
      </div>
      <div className="cm-body">
        <p className="cm-note">Tick the circles you want on the Present tab. They keep their places as you add or hide others.</p>
        {TYPES.map(({ t, title, hint }) => {
          const rows = st.active.filter(s => s.type === t), shown = rows.filter(s => s.shown).length;
          return (
            <section key={t}>
              <div className="cm-sec">
                <span className="caps">{title} · {hint} · {shown} of {rows.length}</span>
                <span>
                  <button className="cm-link" onClick={() => { haptic(6); st.setShown(rows.map(r => r.id), true); }}>all</button>
                  <button className="cm-link" onClick={() => { haptic(6); st.setShown(rows.map(r => r.id), false); }}>none</button>
                </span>
              </div>
              {rows.map(s => (
                <div key={s.id} className="cm-row">
                  <button className={`cm-check ${s.shown ? 'on' : ''}`} aria-label={`${s.shown ? 'Hide' : 'Show'} ${s.name}`} aria-pressed={s.shown} onClick={() => { haptic(6); st.setShown([s.id], !s.shown); }}>
                    {s.shown && <svg width="14" height="14" viewBox="0 0 14 14"><path d="M3 7.5l2.6 2.6L11 4.5" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </button>
                  <button className="cm-main press" onClick={() => setEdit({ id: s.id, type: t })}>
                    <Face s={s} size={38} />
                    <span className="cm-name">{s.name}<small>{labelOf(s)}</small></span>
                    <span style={{ color: INK2 }}>›</span>
                  </button>
                </div>
              ))}
              <button className="cm-add press" onClick={() => setEdit({ type: t })}>+ New {title.toLowerCase()} circle</button>
            </section>
          );
        })}
        {archived.length > 0 && (
          <section>
            <button className="cm-link" style={{ padding: '10px 0' }} onClick={() => setShowArch(v => !v)}>{showArch ? 'Hide' : 'Show'} archived ({archived.length})</button>
            {showArch && archived.map(s => (
              <div key={s.id} className="cm-row" style={{ opacity: .7 }}>
                <button className="cm-main press" onClick={() => setEdit({ id: s.id, type: s.type })}>
                  <Face s={s} size={34} />
                  <span className="cm-name">{s.name}<small>{s.type === 'training' ? 'load' : 'rest'}</small></span>
                </button>
                <button className="chip press" onClick={() => { haptic(8); st.setArchived(s.id, false); }}>Restore</button>
              </div>
            ))}
          </section>
        )}
      </div>
    </Sheet>
  );
};

const Editor = ({ id, type, onClose }: { id?: string; type: StimType; onClose: () => void }) => {
  const st = useStimuli();
  const cur: Stimulus | undefined = id ? st.all.find(s => s.id === id) : undefined;
  const [name, setName] = useState(cur?.name ?? '');
  const [icon, setIcon] = useState(cur?.icon ?? 'mono');
  const [short, setShort] = useState(cur?.short ?? '');
  const [err, setErr] = useState('');
  const preview = { icon, name: name || '?', type };
  const save = () => {
    if (!name.trim()) { setErr('Give it a name.'); return; }
    const ok = cur ? st.edit(cur.id, { name, icon, short }) : st.add({ name, type, icon, short });
    if (ok === null) { setErr(`You already have a ${type === 'training' ? 'load' : 'rest'} circle called “${name.trim()}”.`); return; }
    haptic(10); onClose();
  };
  return (
    <Sheet mode="present" still>
      <div className="cm-head">
        <button className="chip press" onClick={onClose}>Cancel</button>
        <span className="serif" style={{ fontSize: 20 }}>{cur ? 'Edit circle' : 'New circle'}</span>
        <button className="chip on press" onClick={save}>Save</button>
      </div>
      <div className="cm-body">
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, margin: '4px 0 14px' }}>
          <Face s={preview} size={64} />
          <div style={{ flex: 1 }}>
            <input className="cm-input" value={name} onChange={e => { setName(e.target.value); setErr(''); }} placeholder="Name" maxLength={40} autoCapitalize="words" />
            <span className="caps" style={{ display: 'block', marginTop: 6 }}>{type === 'training' ? 'Load' : 'Rest'} · type is fixed once made</span>
          </div>
        </div>
        {err && <p className="cm-err">{err}</p>}
        <span className="caps">Label on the ring</span>
        <input className="cm-input" style={{ margin: '6px 0 16px' }} value={short} onChange={e => setShort(e.target.value)} placeholder={name.trim() ? labelOf({ name }) : 'first word of the name'} maxLength={10} />
        <span className="caps">Icon</span>
        <div className="cm-grid">
          <button className={`cm-ico ${icon === 'mono' ? 'on' : ''}`} onClick={() => setIcon('mono')} aria-label="Letter"><Face s={{ icon: 'mono', name: name || '?', type }} size={46} /><small>Letter</small></button>
          {ICONS.map(i => (
            <button key={i.key} className={`cm-ico ${icon === i.key ? 'on' : ''}`} onClick={() => { haptic(4); setIcon(i.key); }} aria-label={i.label}>
              <Face s={{ icon: i.key, name, type }} size={46} /><small>{i.label}</small>
            </button>
          ))}
        </div>
        {cur && (
          <button className="cm-add press" style={{ marginTop: 22, color: '#A5483A' }} onClick={() => { haptic(10); st.setArchived(cur.id, !cur.archived); onClose(); }}>
            {cur.archived ? 'Restore this circle' : 'Archive this circle'}
          </button>
        )}
        {cur && !cur.archived && <p className="cm-note">Archiving takes it off the Present tab. Everything you logged with it stays in your history, and you can restore it any time.</p>}
      </div>
    </Sheet>
  );
};
