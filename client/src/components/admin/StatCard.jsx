import CountUp from './CountUp';

export default function StatCard({ icon, label, value, format, hint }) {
  return (
    <div className="stat-card">
      <p className="stat-card__label">
        <i className={`bi bi-${icon}`} aria-hidden="true" /> {label}
      </p>
      <p className="stat-card__value">
        <CountUp value={value} format={format} />
      </p>
      {hint && <p className="stat-card__hint">{hint}</p>}
    </div>
  );
}
