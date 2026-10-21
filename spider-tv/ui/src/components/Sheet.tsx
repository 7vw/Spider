import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useBack } from '../core/nav/hooks';
import { ensureFocus } from '../core/nav/engine';

/** Modal layer. Traps D-pad focus and closes on Back. */
export function Sheet({ onClose, children, className = '' }: { onClose: () => void; children: ReactNode; className?: string }) {
  useBack(() => {
    onClose();
    return true;
  });
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    requestAnimationFrame(() => ensureFocus());
    return () => {
      requestAnimationFrame(() => {
        if (prev?.isConnected) prev.focus({ preventScroll: true });
        else ensureFocus();
      });
    };
  }, []);
  return createPortal(
    <div className="sheet-scrim" data-nav-layer>
      <div className={`sheet glass ${className}`} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>,
    document.body,
  );
}
