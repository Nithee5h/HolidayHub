import { motion } from 'motion/react';

const EASE = [0.22, 1, 0.36, 1];

const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

/**
 * Scroll-entrance wrapper: fades + rises once when scrolled into view.
 * Reduced-motion users get the opacity change only (via MotionConfig in App).
 */
export function Reveal({ as = 'div', delay = 0, className, children, ...rest }) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.2 }}
      variants={itemVariants}
      transition={{ delay }}
      {...rest}
    >
      {children}
    </Component>
  );
}

/** Parent that staggers its <RevealItem> children as the group enters view. */
export function RevealGroup({ as = 'div', stagger = 0.08, className, children, ...rest }) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.15 }}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: stagger } } }}
      {...rest}
    >
      {children}
    </Component>
  );
}

export function RevealItem({ as = 'div', className, children, ...rest }) {
  const Component = motion[as];
  return (
    <Component className={className} variants={itemVariants} {...rest}>
      {children}
    </Component>
  );
}
