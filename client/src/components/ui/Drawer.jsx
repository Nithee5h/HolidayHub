import { useRef } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import './Drawer.css';

const EASE = [0.22, 1, 0.36, 1];

/** Accessible modal side sheet (slides in from the left on small screens). */
export default function Drawer({ open, onClose, title, id, returnFocusRef, footer, children }) {
  const panelRef = useRef(null);
  useModalBehavior(open, panelRef, onClose, returnFocusRef);

  return (
    <AnimatePresence>
      {open && (
        <div className="hh-drawer" id={id}>
          <motion.div
            className="hh-drawer__backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
          <motion.div
            ref={panelRef}
            className="hh-drawer__panel"
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.38, ease: EASE }}
          >
            <div className="hh-drawer__head">
              <h2 className="hh-drawer__title font-display">{title}</h2>
              <button type="button" className="hh-drawer__close" onClick={onClose} aria-label={`Close ${title.toLowerCase()}`}>
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </div>
            <div className="hh-drawer__body">{children}</div>
            {footer && <div className="hh-drawer__footer">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
