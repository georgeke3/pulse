import type { ReactNode } from 'react';
import { Glyph } from './Glyphs';
import { SANS, SERIF, SKINS, type Mode } from './skins';

const TABS: { m: Mode; label: string }[] = [{ m: 'home', label: 'Home' }, { m: 'past', label: 'Past' }, { m: 'present', label: 'Present' }, { m: 'future', label: 'Future' }];

export const Screen = ({ mode, title, right, children, hideTabs, onTab, overlay }: { mode: Mode; title: string; right?: ReactNode; children: ReactNode; hideTabs?: boolean; onTab: (m: Mode) => void; overlay?: ReactNode }) => {
  const S = SKINS[mode];
  return (
    <div style={{ position: 'fixed', inset: 0, maxWidth: 520, margin: '0 auto', display: 'flex', flexDirection: 'column', background: S.bg, color: S.ink, fontFamily: SANS, overflow: 'hidden', touchAction: 'manipulation' }}>
      <div style={{ height: 'calc(40px + env(safe-area-inset-top))', paddingTop: 'env(safe-area-inset-top)', flex: 'none', padding: 'env(safe-area-inset-top) 16px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', boxSizing: 'border-box' }}>
        <span style={{ fontFamily: SERIF, fontSize: 24, alignSelf: 'flex-end' }}>{title}</span>
        <span style={{ fontSize: 12, color: S.mute, alignSelf: 'flex-end', paddingBottom: 4 }}>{right}</span>
      </div>
      <div style={{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' }}>{children}{overlay}</div>
      {!hideTabs && (
        <div style={{ display: 'flex', borderTop: '1px solid #cfc8b8', background: S.tab, height: 'calc(56px + env(safe-area-inset-bottom))', paddingBottom: 'env(safe-area-inset-bottom)', boxSizing: 'border-box', flex: 'none' }}>
          {TABS.map(t => {
            const on = mode === t.m;
            return (
              <button key={t.m} onClick={() => onTab(t.m)} style={{ flex: 1, border: 0, background: 'none', padding: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, paddingTop: 4, fontFamily: SANS, fontSize: 11, color: on ? S.ink : '#5F5A4E', fontWeight: on ? 500 : 400 }}>
                {t.m === 'home'
                  ? <span style={{ width: on ? 44 : 38, height: on ? 44 : 38, borderRadius: '50%', background: '#F2EEE6', border: '2px solid #9C7B3C', display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: -16, opacity: on ? 1 : .8, boxShadow: '0 2px 6px #0002' }}><Glyph mode="home" size={on ? 28 : 24} /></span>
                  : <span style={{ opacity: on ? 1 : .65, display: 'flex' }}><Glyph mode={t.m} /></span>}
                {t.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
