import { useId } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { isBookable, unitPrice } from '../../utils/departures';
import { MAX_TRAVELLERS } from '../../utils/search';
import { formatDate, formatPrice } from '../../utils/format';
import Button from '../ui/Button';
import Stepper from '../ui/Stepper';
import './BookingSummary.css';

/**
 * Price summary with travellers + live estimated total. The server
 * recalculates the authoritative total at checkout (Phase 5).
 */
export default function BookingSummary({ pkg, departure, travellers, onTravellersChange, className = '' }) {
  const uid = useId();
  const price = unitPrice(pkg, departure);
  const total = price * travellers;
  const bookable = departure && isBookable(departure, travellers);
  const maxTravellers = departure ? Math.max(1, Math.min(MAX_TRAVELLERS, departure.seatsRemaining)) : MAX_TRAVELLERS;

  return (
    <div className={`booking-summary surface-card ${className}`}>
      <p className="booking-summary__label">{departure ? 'Price per person' : 'Starting from'}</p>
      <p className="booking-summary__price">
        {formatPrice(price, pkg.currency)} <span>/ person</span>
      </p>

      <div className="booking-summary__row">
        <span className="booking-summary__key">
          <i className="bi bi-calendar-event" aria-hidden="true" /> Departure
        </span>
        <span className="booking-summary__value">{departure ? `${formatDate(departure.startDate)} – ${formatDate(departure.endDate)}` : 'Choose a date'}</span>
      </div>

      <div className="booking-summary__row">
        <label htmlFor={`${uid}-travellers`} className="booking-summary__key">
          <i className="bi bi-people" aria-hidden="true" /> Travellers
        </label>
        <Stepper id={`${uid}-travellers`} label="travellers" value={travellers} min={1} max={maxTravellers} onChange={onTravellersChange} className="booking-summary__stepper" />
      </div>

      <div className="booking-summary__total">
        <span>
          {formatPrice(price, pkg.currency)} × {travellers}
        </span>
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.strong
            key={total}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            aria-live="polite"
          >
            {formatPrice(total, pkg.currency)}
          </motion.strong>
        </AnimatePresence>
      </div>
      <p className="booking-summary__note">Estimated total. The final price is verified at checkout.</p>

      {bookable ? (
        <Button to={`/booking/${departure.id}?travellers=${travellers}`} variant="primary" size="lg" block iconEnd="arrow-right">
          Book Now
        </Button>
      ) : (
        <Button variant="primary" size="lg" block disabled>
          {departure ? 'Not enough seats' : 'Select a departure'}
        </Button>
      )}
    </div>
  );
}
