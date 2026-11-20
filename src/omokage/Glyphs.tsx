import type { Mode } from './skins';
export const Glyph = ({ mode, color, size = 26 }: { mode: Mode; color: string; size?: number }) => {
  const p = { fill: 'none', stroke: color, strokeWidth: 1.6, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      {mode === 'past' && (<g {...p}><path d="M16 8v16" /><path d="M16 12C12 5 5 6 6 12c.5 4 6 4 10 0z" /><path d="M16 12c4-7 11-6 10 0-.5 4-6 4-10 0z" /><path d="M16 20c-3 5-8 5-8 1s5-3 8-1z" /><path d="M16 20c3 5 8 5 8 1s-5-3-8-1z" /></g>)}
      {mode === 'present' && (<g {...p}><path d="M16 4l10 4v8c0 6-4 10-10 12C10 26 6 22 6 16V8z" /><circle cx="16" cy="15" r="3" /><path d="M16 9v3M16 18v3" /></g>)}
      {mode === 'future' && (<g {...p}><path d="M16 3c1 7 3 10 11 13-8 3-10 6-11 13-1-7-3-10-11-13 8-3 10-6 11-13z" /><circle cx="16" cy="16" r="1.6" fill={color} /></g>)}
      {mode === 'home' && (<g><circle cx="16" cy="16" r="11" fill="none" stroke={color} strokeWidth="1.6" /><circle cx="10.5" cy="17" r="2.3" fill="#788eaa" /><circle cx="16" cy="13.5" r="2.3" fill="#b08e54" /><circle cx="21.5" cy="17" r="2.3" fill="#a65454" /></g>)}
    </svg>
  );
};
