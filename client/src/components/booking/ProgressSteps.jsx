import { motion } from 'motion/react';
import './booking.css';

/** Checkout progress: numbered steps + animated fill bar. */
export default function ProgressSteps({ steps, current }) {
  const pct = (current / (steps.length - 1)) * 100;
  return (
    <nav className="progress-steps" aria-label="Checkout progress">
      <div className="progress-steps__track" aria-hidden="true">
        <motion.div className="progress-steps__fill" initial={false} animate={{ width: `${pct}%` }} transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <ol>
        {steps.map((label, i) => {
          const state = i < current ? 'done' : i === current ? 'current' : 'todo';
          return (
            <li key={label} className={`progress-steps__item is-${state}`} aria-current={i === current ? 'step' : undefined}>
              <span className="progress-steps__dot" aria-hidden="true">
                {state === 'done' ? <i className="bi bi-check-lg" /> : i + 1}
              </span>
              <span className="progress-steps__label">
                {label}
                {state === 'done' && <span className="visually-hidden"> (completed)</span>}
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
