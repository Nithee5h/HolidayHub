import { useState } from 'react';
import './Stepper.css';

const clamp = (value, min, max) => {
  const n = Number.parseInt(value, 10);
  return Math.min(Math.max(Number.isFinite(n) ? n : min, min), max);
};

/**
 * Numeric stepper: −/+ buttons around a number input.
 * Typing is allowed; the value is clamped to [min, max] on blur.
 */
export default function Stepper({ id, name, value, min = 1, max = 12, onChange, label, className = '' }) {
  const [draft, setDraft] = useState(String(value));
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    setDraft(String(value));
  }

  const commit = (next) => {
    const clamped = clamp(next, min, max);
    setDraft(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <div className={`hh-stepper ${className}`}>
      <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => commit(value - 1)}>
        <i className="bi bi-dash" aria-hidden="true" />
      </button>
      <input
        id={id}
        name={name}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => commit(draft)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit(draft);
        }}
      />
      <button type="button" aria-label={`Increase ${label}`} disabled={value >= max} onClick={() => commit(value + 1)}>
        <i className="bi bi-plus" aria-hidden="true" />
      </button>
    </div>
  );
}
