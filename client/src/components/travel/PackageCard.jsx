import { Link } from 'react-router';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'motion/react';
import { useMediaQuery } from '../../hooks/useMediaQuery';
import { seatsLabel, LOW_SEATS } from '../../utils/departures';
import { formatDate, formatDuration, formatPrice } from '../../utils/format';
import SmartImage from '../ui/SmartImage';
import './PackageCard.css';

const MAX_TILT = 4; // degrees — subtle, desktop + fine pointer only

function DepartureIndicator({ summary }) {
  if (!summary) return null;
  const { next, upcomingCount } = summary;
  if (next) {
    const low = next.seatsRemaining <= LOW_SEATS;
    return (
      <p className={`pkg-card__departure ${low ? 'is-low' : ''}`}>
        <i className="bi bi-calendar-check" aria-hidden="true" />
        <span className="visually-hidden">Next departure</span>
        {formatDate(next.startDate)} · {seatsLabel(next)}
      </p>
    );
  }
  return (
    <p className="pkg-card__departure is-none">
      <i className="bi bi-calendar-x" aria-hidden="true" />
      {upcomingCount > 0 ? 'Fully booked for your party size' : 'No upcoming departures'}
    </p>
  );
}

/**
 * `pkg.departureSummary` (from the catalog service) adds a departure indicator.
 * `linkSearch` carries search context (e.g. travellers) to the details page.
 */
export default function PackageCard({ pkg, linkSearch = '' }) {
  const finePointer = useMediaQuery('(hover: hover) and (pointer: fine)');
  const reduceMotion = useReducedMotion();
  const tiltEnabled = finePointer && !reduceMotion;

  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 200, damping: 20 };
  const rotateX = useSpring(useTransform(py, [0, 1], [MAX_TILT, -MAX_TILT]), spring);
  const rotateY = useSpring(useTransform(px, [0, 1], [-MAX_TILT, MAX_TILT]), spring);

  const onPointerMove = (event) => {
    if (!tiltEnabled) return;
    const rect = event.currentTarget.getBoundingClientRect();
    px.set((event.clientX - rect.left) / rect.width);
    py.set((event.clientY - rect.top) / rect.height);
  };
  const onPointerLeave = () => {
    px.set(0.5);
    py.set(0.5);
  };

  const cover = pkg.images?.[0];
  const href = `/packages/${pkg.slug}${linkSearch ? `?${linkSearch}` : ''}`;

  return (
    <motion.article
      className="pkg-card"
      style={tiltEnabled ? { rotateX, rotateY, transformPerspective: 900 } : undefined}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerLeave}
    >
      <div className="pkg-card__media">
        <SmartImage src={cover?.url} alt={cover?.alt ?? ''} sizes="(min-width: 1200px) 380px, (min-width: 768px) 50vw, 100vw" width={800} />
        <span className="pkg-card__category">{pkg.category}</span>
        <span className="pkg-card__duration">
          <i className="bi bi-clock" aria-hidden="true" /> {formatDuration(pkg.durationDays)}
        </span>
      </div>

      <div className="pkg-card__body">
        <p className="pkg-card__place">
          <i className="bi bi-geo-alt" aria-hidden="true" /> {pkg.destination}, {pkg.country}
        </p>
        <h3 className="pkg-card__title">
          <Link to={href} className="stretched-link">
            {pkg.title}
          </Link>
        </h3>
        <p className="pkg-card__summary">{pkg.summary}</p>

        <DepartureIndicator summary={pkg.departureSummary} />

        <ul className="pkg-card__highlights" aria-label="Highlights">
          {pkg.inclusions.slice(0, 2).map((item) => (
            <li key={item}>
              <i className="bi bi-check2-circle" aria-hidden="true" /> {item}
            </li>
          ))}
        </ul>

        <div className="pkg-card__footer">
          <p className="pkg-card__price">
            <span>From</span>
            <strong>{formatPrice(pkg.basePrice, pkg.currency)}</strong>
            <span>/ person</span>
          </p>
          <span className="pkg-card__cta" aria-hidden="true">
            View details <i className="bi bi-arrow-right" />
          </span>
        </div>
      </div>
    </motion.article>
  );
}
