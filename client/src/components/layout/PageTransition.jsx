import { motion } from 'motion/react';

/**
 * Enter-only route transition: the new page fades/slides in immediately,
 * so navigation is never held back waiting for an exit animation.
 */
export default function PageTransition({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
