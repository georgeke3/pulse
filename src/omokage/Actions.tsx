import { useEffect, useState, type ReactNode } from 'react';

/** The one way every sheet and card ends: dismiss at the bottom-left, the main action at the bottom-right.
 *  Label it "Cancel" when closing throws something away, "Close" when there is nothing to discard. */
export const ActionBar = ({ cancel = 'Cancel', onCancel, primary, onPrimary, disabled, keepFocus, flush, h = 54, dirty, children }: {
  /** unsaved work: the first tap on Cancel asks "Discard?", the second throws it away */ dirty?: boolean; cancel?: string; onCancel: () => void; primary?: string; onPrimary?: () => void; disabled?: boolean; keepFocus?: boolean; flush?: boolean; h?: number; children?: ReactNode;
}) => {
  const [armed, setArmed] = useState(false);
  useEffect(() => { if (!armed) return; const t = setTimeout(() => setArmed(false), 3500); return () => clearTimeout(t); }, [armed]);
  useEffect(() => { if (!dirty) setArmed(false); }, [dirty]);
  const nf = keepFocus ? { onMouseDown: (e: React.MouseEvent) => e.preventDefault() } : {};
  return (
    <div style={{ flex: 'none', display: 'flex', gap: 10, padding: flush ? 0 : '0 20px calc(12px + var(--sb))' }}>
      <button className="chip press" style={{ height: h, flex: '0 0 30%', fontSize: 15, ...(armed ? { background: '#B5483A', color: '#fff', boxShadow: 'none' } : {}) }} onClick={() => (dirty && !armed ? setArmed(true) : onCancel())} {...nf}>{armed ? 'Discard?' : cancel}</button>
      {children}
      {primary && <button className="chip on press" style={{ height: h, flex: 1, fontSize: 16, opacity: disabled ? .35 : 1 }} onClick={() => !disabled && onPrimary?.()} {...nf}>{primary}</button>}
    </div>
  );
};

/** Top-left "back" for nested screens inside a tab (the subtitle changes). Sheets that replace the whole title use Close in the bottom bar instead. */
export const Back = ({ label, onBack }: { label: string; onBack: () => void }) => (
  <button className="press" onClick={onBack} aria-label={`Back to ${label}`} style={{ fontSize: 13, color: '#6B7186', padding: '4px 0', whiteSpace: 'nowrap' }}>‹ {label}</button>
);
