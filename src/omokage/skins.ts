export type Mode = 'past' | 'present' | 'future' | 'home';
export const DOT = { past: '#6F86A3', present: '#B8924A', future: '#9B3A44' } as const;
export const LOAD = '#C4643F', REST = '#4E5D78', BRASS = '#B8924A';

const p2 = (n: number) => String(n).padStart(2, '0');
export const dstr = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const todayStr = () => dstr(new Date());
export const nowHalfHour = () => { const d = new Date(); return d.getHours() * 60 + (d.getMinutes() >= 30 ? 30 : 0); };
export const fmtMin = (m: number, short = false) => {
  const mm = ((m % 1440) + 1440) % 1440, h = Math.floor(mm / 60), r = mm % 60;
  const hh = ((h + 11) % 12) + 1, ap = h < 12 ? 'am' : 'pm';
  return short ? `${hh}${r ? ':' + p2(r) : ''}${ap[0]}` : `${hh}:${p2(r)} ${ap}`;
};
export const hhmm = (m: number) => { const mm = ((m % 1440) + 1440) % 1440; return `${p2(Math.floor(mm / 60))}:${p2(mm % 60)}`; };
export const parseHM = (s: unknown): number | null => {
  if (typeof s !== 'string') return null;
  const [h, m] = s.split(':').map(Number);
  return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null;
};
export const shortDate = (d = new Date()) => `${d.toLocaleDateString('en', { weekday: 'short' })} ${d.getDate()} ${d.toLocaleDateString('en', { month: 'short' })}`;
export const fromDstr = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const ago = (s: string) => {
  const days = Math.round((fromDstr(todayStr()).getTime() - fromDstr(s).getTime()) / 864e5);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 14) return `${days} days ago`;
  if (days < 60) return `${Math.round(days / 7)} weeks ago`;
  if (days < 365) return `${Math.round(days / 30)} months ago`;
  return `${Math.round(days / 365)} year${days >= 730 ? 's' : ''} ago`;
};
