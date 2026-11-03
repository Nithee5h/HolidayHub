import { useMemo } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import './booking.css';

const COLORS = ['#FF785A', '#00BFA6', '#0B2545', '#FFB36B'];
const PIECES = 26;

/** Checkmark that draws itself + a single, subtle confetti burst (skipped for reduced motion). */
export default function SuccessCheck() {
  const reduce = useReducedMotion();
  // Deterministic spread so renders are stable.
  const confetti = useMemo(
    () =>
      Array.from({ length: PIECES }, (_, i) => {
        const angle = (i / PIECES) * Math.PI * 2;
        const dist = 90 + ((i * 37) % 70);
        return { x: Math.cos(angle) * dist, y: Math.sin(angle) * dist - 30, r: (i * 47) % 360, c: COLORS[i % COLORS.length], d: (i % 5) * 0.03 };
      }),
    [],
  );

  return (
    <div className="success-check" aria-hidden="true">
      {!reduce &&
        confetti.map((p, i) => (
          <motion.span
            key={i}
            className="success-check__confetti"
            style={{ background: p.c }}
            initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.6 }}
            animate={{ x: p.x, y: [0, p.y, p.y + 60], opacity: [0, 1, 0], rotate: p.r, scale: 1 }}
            transition={{ duration: 1.4, delay: 0.35 + p.d, ease: 'easeOut' }}
          />
        ))}
      <svg viewBox="0 0 96 96" width="96" height="96">
        <motion.circle cx="48" cy="48" r="44" fill="none" stroke="#00BFA6" strokeWidth="6" initial={{ pathLength: reduce ? 1 : 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} />
        <motion.path
          d="M28 50 L42 64 L68 34"
          fill="none"
          stroke="#00796B"
          strokeWidth="7"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: reduce ? 1 : 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.4, delay: reduce ? 0 : 0.45 }}
        />
      </svg>
    </div>
  );
}
