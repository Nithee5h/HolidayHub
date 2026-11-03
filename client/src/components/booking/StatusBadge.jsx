import './booking.css';

const LABELS = {
  confirmed: { label: 'Confirmed', icon: 'check-circle-fill', tone: 'success' },
  pending: { label: 'Awaiting payment', icon: 'hourglass-split', tone: 'warning' },
  cancelled: { label: 'Cancelled', icon: 'x-circle-fill', tone: 'muted' },
  completed: { label: 'Completed', icon: 'flag-fill', tone: 'info' },
};

const PAYMENT = { paid_demo: 'Paid (demo)', unpaid: 'Unpaid', refunded_demo: 'Refunded (demo)' };

export default function StatusBadge({ status, payment }) {
  const s = LABELS[status] ?? LABELS.pending;
  return (
    <span className="status-badges">
      <span className={`status-badge status-badge--${s.tone}`}>
        <i className={`bi bi-${s.icon}`} aria-hidden="true" /> {s.label}
      </span>
      {payment && <span className="status-badge status-badge--outline">{PAYMENT[payment]}</span>}
    </span>
  );
}
