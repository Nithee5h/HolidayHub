import { useCallback, useEffect, useId, useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import Button from './Button';
import './ConfirmDialog.css';

/**
 * Accessible confirmation dialog (alertdialog) for dangerous actions.
 * Focus starts on the safe "cancel" action; Escape and backdrop close it.
 */
export default function ConfirmDialog({ open, title, children, confirmLabel = 'Confirm', cancelLabel = 'Keep it', tone = 'danger', busy = false, onConfirm, onClose }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descId = useId();
  // Stable close handler so the modal effect doesn't re-run on every render.
  const latest = useRef({ busy, onClose });
  useEffect(() => {
    latest.current = { busy, onClose };
  });
  const requestClose = useCallback(() => {
    if (!latest.current.busy) latest.current.onClose();
  }, []);
  useModalBehavior(open, panelRef, requestClose);

  return (
    <AnimatePresence>
      {open && (
        <div className="hh-dialog">
          <motion.div className="hh-dialog__backdrop" onClick={requestClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
          <motion.div
            ref={panelRef}
            className="hh-dialog__panel"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.22 }}
          >
            <span className={`hh-dialog__icon hh-dialog__icon--${tone}`} aria-hidden="true">
              <i className={`bi bi-${tone === 'danger' ? 'exclamation-triangle' : 'question-circle'}`} />
            </span>
            <h2 id={titleId} className="hh-dialog__title">
              {title}
            </h2>
            <div id={descId} className="hh-dialog__body">
              {children}
            </div>
            <div className="hh-dialog__actions">
              <Button variant="outline" onClick={onClose} disabled={busy}>
                {cancelLabel}
              </Button>
              <Button variant={tone === 'danger' ? 'ocean' : 'primary'} className={tone === 'danger' ? 'hh-btn--danger' : ''} onClick={onConfirm} disabled={busy}>
                {busy ? 'Please wait…' : confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
