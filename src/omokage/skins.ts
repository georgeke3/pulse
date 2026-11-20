export type Mode = 'past' | 'present' | 'future' | 'home';
export interface Skin { paper: string; card: string; ink: string; mute: string; accent: string; line: string; dash: boolean; tabbg: string; font: string }
const SERIF = "'Lora', Georgia, 'Times New Roman', serif";
export const SKINS: Record<Mode, Skin> = {
  past:    { paper: '#f4f1e8', card: '#fbf9f3', ink: '#3a3642', mute: '#8b8794', accent: '#788eaa', line: '#c9cfd8', dash: true,  tabbg: '#ece8dc', font: SERIF },
  present: { paper: '#eee3c6', card: '#f6edd4', ink: '#3a3642', mute: '#8a7c5c', accent: '#b08e54', line: '#b08e54', dash: false, tabbg: '#e3d6b2', font: SERIF },
  future:  { paper: '#d5dce6', card: '#e4e9f0', ink: '#2c3350', mute: '#6b748c', accent: '#a65454', line: '#a9b4c6', dash: false, tabbg: '#c8d1de', font: SERIF },
  home:    { paper: '#ebe6d8', card: '#f6f2e8', ink: '#3a3642', mute: '#8b8794', accent: '#b08e54', line: '#c9c2b0', dash: false, tabbg: '#e2ddcf', font: SERIF },
};
export const DOT: Record<'past' | 'present' | 'future', string> = { past: '#788eaa', present: '#b08e54', future: '#a65454' };
export const todayStr = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
export const roundHalfHour = (d = new Date()) => {
  const m = d.getHours() * 60 + (d.getMinutes() >= 30 ? 30 : 0);
  return m;
};
export const fmtMin = (m: number) => {
  const mm = ((m % 1440) + 1440) % 1440;
  const h = Math.floor(mm / 60), r = mm % 60;
  return `${((h + 11) % 12) + 1}:${String(r).padStart(2, '0')} ${h < 12 ? 'am' : 'pm'}`;
};
