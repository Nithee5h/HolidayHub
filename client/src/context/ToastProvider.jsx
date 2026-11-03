import { useCallback, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ToastContext } from './toastContext';
import './Toast.css';

const DURATION_MS = 5000;
const ICONS = { success: 'check-circle-fill', error: 'exclamation-octagon-fill', info: 'info-circle-fill' };

export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const nextId = useRef(0);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const toast = useCallback(
    ({ title, message, tone = 'info' }) => {
      nextId.current += 1;
      const id = nextId.current;
      setToasts((list) => [...list.slice(-2), { id, title, message, tone }]);
      setTimeout(() => dismiss(id), DURATION_MS);
    },
    [dismiss],
  );
  const value = useMemo(() => ({ toast, dismiss }), [toast, dismiss]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Always-present live region so additions are announced. */}
      <div className="toast-stack" role="status" aria-live="polite">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              className={`toast-card toast-card--${t.tone}`}
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.25 }}
            >
              <i className={`bi bi-${ICONS[t.tone]}`} aria-hidden="true" />
              <div className="toast-card__body">
                <strong>{t.title}</strong>
                {t.message && <p>{t.message}</p>}
              </div>
              <button type="button" className="toast-card__close" onClick={() => dismiss(t.id)} aria-label="Dismiss notification">
                <i className="bi bi-x" aria-hidden="true" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
