import { motion, useReducedMotion } from 'motion/react';

/** Horizontal ranked bars with direct labels (single series; values always shown as text). */
export default function RankedBars({ items, title, unit = '' }) {
  const reduce = useReducedMotion();
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) return <p className="chart__empty">No bookings yet.</p>;
  return (
    <ul className="hbar" aria-label={title}>
      {items.map((item, i) => (
        <li key={item.label}>
          <span className="hbar__label">{item.label}</span>
          <span className="hbar__track" aria-hidden="true">
            <motion.span
              className="hbar__fill"
              style={{ display: 'block', width: `${(item.value / max) * 100}%`, transformOrigin: 'left' }}
              initial={reduce ? false : { scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.6, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] }}
            />
          </span>
          <span className="hbar__value">
            {item.value} {unit}
            {item.extra && <small className="text-muted-hh"> · {item.extra}</small>}
          </span>
        </li>
      ))}
    </ul>
  );
}
