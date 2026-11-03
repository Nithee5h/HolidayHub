import { motion } from 'motion/react';
import './EmptyState.css';

/** Friendly empty / unavailable state with icon, message and optional actions. */
export default function EmptyState({ icon = 'compass', title, children, actions, headingLevel = 2 }) {
  const Heading = `h${headingLevel}`;
  return (
    <motion.div
      className="empty-state"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
    >
      <span className="empty-state__icon" aria-hidden="true">
        <i className={`bi bi-${icon}`} />
      </span>
      <Heading className="empty-state__title font-display">{title}</Heading>
      {children && <div className="empty-state__text">{children}</div>}
      {actions && <div className="empty-state__actions">{actions}</div>}
    </motion.div>
  );
}
