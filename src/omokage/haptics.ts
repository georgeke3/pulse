/**
 * Haptic tick. Android: navigator.vibrate. iOS Safari 18+: toggling a <input type="checkbox" switch>
 * via its label fires the system haptic. Both silently no-op elsewhere.
 */
let label: HTMLLabelElement | null = null;
const ensure = () => {
  if (label || typeof document === 'undefined') return label;
  label = document.createElement('label');
  label.setAttribute('aria-hidden', 'true');
  label.style.cssText = 'position:fixed;width:1px;height:1px;opacity:0;pointer-events:none;overflow:hidden;left:-10px;top:-10px';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.setAttribute('switch', '');
  input.tabIndex = -1;
  label.appendChild(input);
  document.body.appendChild(label);
  return label;
};
export const haptic = (ms = 8) => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && navigator.vibrate(ms)) return;
    ensure()?.click();
  } catch { /* ignore */ }
};
