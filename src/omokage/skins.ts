export type Mode = 'past' | 'present' | 'future' | 'home';

export const INK = '#2B3247', INK2 = '#646B7E', SKY = '#6F8FB5', EMBER = '#D07A55', GOLD = '#C8A15A', SEPIA = '#B08A64', CRIMSON = '#A8323E', DUSK = '#9AABC0';
export const DOT = { past: SEPIA, present: GOLD, future: CRIMSON } as const;
export const LOAD = EMBER, REST = SKY, BRASS = GOLD;
export const GROUND: Record<Mode, string> = { past: '#F7F1E5', present: '#FDFDFB', future: '#E9EEF5', home: '#FAF8F3' };
/** colour the tab bar fades into, matching the bottom of each ground */
export const TABFADE: Record<Mode, string> = { past: '247,241,229', present: '253,253,251', future: '214,223,234', home: '230,236,244' };
export const WASH: Record<Mode, string> = { home: 'rgba(200,161,90,.30)', past: 'rgba(176,138,100,.28)', present: 'rgba(200,161,90,.32)', future: 'rgba(168,50,62,.20)' };

const p2 = (n: number) => String(n).padStart(2, '0');
export const dstr = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const todayStr = () => dstr(new Date());
export const nowHalfHour = () => { const d = new Date(); return d.getHours() * 60 + (d.getMinutes() >= 30 ? 30 : 0); };
export const fmtMin = (m: number, short = false) => {
  const mm = ((m % 1440) + 1440) % 1440, h = Math.floor(mm / 60), r = mm % 60;
  const hh = ((h + 11) % 12) + 1, ap = h < 12 ? 'am' : 'pm';
  return short ? `${hh}${r ? ':' + p2(r) : ''}${ap[0]}` : `${hh}:${p2(r)} ${ap}`;
};
export const fmtClock = (m: number) => { const mm = ((m % 1440) + 1440) % 1440, h = Math.floor(mm / 60); return { t: `${((h + 11) % 12) + 1}:${p2(mm % 60)}`, ap: h < 12 ? 'am' : 'pm' }; };
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
const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
export const agoWords = (s: string) => ago(s).replace(/^(\d+)/, (_, n) => WORDS[+n] ?? n);
