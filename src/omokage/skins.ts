export type Mode = 'past' | 'present' | 'future' | 'home';
export interface Skin { bg: string; ink: string; mute: string; tab: string; card: string; dash: string; chip: string; chipInk: string; accent: string }
const mute = '#5F5A4E';
export const SKINS: Record<Mode, Skin> = {
  past:    { bg: '#F2EEE6', ink: '#34405A', mute, tab: '#EDE6D6', card: '#F7F4EE', dash: '#8FA3B8', chip: '#E3D6BE', chipInk: '#4a3f2a', accent: '#6F86A3' },
  present: { bg: '#E8DCC4', ink: '#3B4250', mute, tab: '#DCCFAF', card: '#F0E6D0', dash: '#9C7B3C', chip: '#E3D6BE', chipInk: '#4a3f2a', accent: '#9C7B3C' },
  future:  { bg: '#D3DAE3', ink: '#1F2A44', mute, tab: '#C3CCD9', card: '#E8ECF1', dash: '#5C6B82', chip: '#BFC9D6', chipInk: '#1F2A44', accent: '#9B3A44' },
  home:    { bg: 'linear-gradient(180deg,#F2EEE6 0%,#E8DCC4 48%,#D3DAE3 100%)', ink: '#34405A', mute, tab: '#D9D8DB', card: '#F4F0E6', dash: '#8FA3B8', chip: '#E3D6BE', chipInk: '#4a3f2a', accent: '#9C7B3C' },
};
export const DOT = { past: '#6F86A3', present: '#B8924A', future: '#9B3A44' } as const;
export const LOAD = '#A8482A', REST = '#3B4250', BRASS = '#9C7B3C';
export const SANS = "Inter, system-ui, -apple-system, sans-serif";
export const SERIF = "Lora, Georgia, serif";
const p2 = (n: number) => String(n).padStart(2, '0');
export const dstr = (d: Date) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
export const todayStr = () => dstr(new Date());
export const nowHalfHour = () => { const d = new Date(); return d.getHours() * 60 + (d.getMinutes() >= 30 ? 30 : 0); };
export const fmtMin = (m: number) => {
  const mm = ((m % 1440) + 1440) % 1440, h = Math.floor(mm / 60), r = mm % 60;
  return `${((h + 11) % 12) + 1}:${p2(r)} ${h < 12 ? 'am' : 'pm'}`;
};
export const hhmm = (m: number) => { const mm = ((m % 1440) + 1440) % 1440; return `${p2(Math.floor(mm / 60))}:${p2(mm % 60)}`; };
export const parseHM = (s: unknown): number | null => { if (typeof s !== 'string') return null; const [h, m] = s.split(':').map(Number); return Number.isFinite(h) && Number.isFinite(m) ? h * 60 + m : null; };
export const longDate = (d = new Date()) => `${d.toLocaleDateString('en', { weekday: 'short' })} ${d.getDate()} ${d.toLocaleDateString('en', { month: 'short' })}`;
