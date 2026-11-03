import { useEffect, useState } from 'react';

const remaining = (expiresAt) => Math.max(0, new Date(expiresAt).getTime() - Date.now());

/** "Seats held for 14:32". Calls onExpire once when the hold runs out. */
export default function HoldCountdown({ expiresAt, onExpire, className = '' }) {
  const [ms, setMs] = useState(() => remaining(expiresAt));

  useEffect(() => {
    const tick = () => {
      const left = remaining(expiresAt);
      setMs(left);
      if (left === 0) {
        clearInterval(timer);
        onExpire?.();
      }
    };
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [expiresAt, onExpire]);

  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  const label = `${minutes}:${String(seconds).padStart(2, '0')}`;
  return (
    <span className={`hold-countdown ${ms < 120000 ? 'is-urgent' : ''} ${className}`}>
      <i className="bi bi-stopwatch" aria-hidden="true" /> Seats held for <strong>{label}</strong>
      {/* Announce only at minute boundaries, not every second. */}
      <span className="visually-hidden" aria-live="polite">
        {seconds === 0 && minutes > 0 ? `${minutes} minutes left to pay` : ''}
      </span>
    </span>
  );
}
