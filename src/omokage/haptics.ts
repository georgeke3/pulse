/**
 * Haptic tick. Android: navigator.vibrate. iOS Safari 17.4+ / home-screen apps: toggling an <input type="checkbox" switch>
 * through its label fires the system's light tick. iOS only does that for a switch that was just rendered and clicked inside
 * the touch event that is running, so each tick builds a fresh switch, clicks it, and drops it again (reusing one is unreliable
 * when ticks come quickly, like while scrubbing). Both paths silently no-op elsewhere.
 */
export const haptic = (ms = 8) => {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator && navigator.vibrate(ms)) return;
    if (typeof document === 'undefined') return;
    const id = 'h' + Math.random().toString(36).slice(2);
    const label = document.createElement('label');
    label.setAttribute('aria-hidden', 'true');
    label.htmlFor = id;
    label.style.cssText = 'position:fixed;left:0;top:0;width:44px;height:44px;opacity:.01;pointer-events:none;z-index:-1';
    const input = document.createElement('input');
    input.type = 'checkbox'; input.id = id; input.tabIndex = -1;
    input.setAttribute('switch', '');
    label.appendChild(input);
    document.body.appendChild(label);
    label.click();
    label.remove();
  } catch { /* ignore */ }
};
