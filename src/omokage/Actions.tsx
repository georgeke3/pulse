import type { ReactNode } from 'react';

/** The one way every sheet and card ends: dismiss at the bottom-left, the main action at the bottom-right.
 *  Label it "Cancel" when closing throws something away, "Close" when there is nothing to discard. */
export const ActionBar = ({ cancel = 'Cancel', onCancel, primary, onPrimary, disabled, keepFocus, flush, h = 54, children }: {
  cancel?: string; onCancel: () => void; primary?: string; onPrimary?: () => void; disabled?: boolean; keepFocus?: boolean; flush?: boolean; h?: number; children?: ReactNode;
}) => {
  const nf = keepFocus ? { onMouseDown: (e: React.MouseEvent) => e.preventDefault() } : {};
  return (
    <div style={{ flex: 'none', display: 'flex', gap: 10, padding: flush ? 0 : '0 20px calc(12px + var(--sb))' }}>
      <button className="chip press" style={{ height: h, flex: '0 0 30%', fontSize: 15 }} onClick={onCancel} {...nf}>{cancel}</button>
      {children}
      {primary && <button className="chip on press" style={{ height: h, flex: 1, fontSize: 16, opacity: disabled ? .35 : 1 }} onClick={() => !disabled && onPrimary?.()} {...nf}>{primary}</button>}
    </div>
  );
};
