import { useId } from 'react';
import { isBookable, LOW_SEATS, seatsLabel, unitPrice } from '../../utils/departures';
import { formatDate, formatPrice } from '../../utils/format';
import './DepartureSelector.css';

const weekday = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' });

/** Radio-card list of upcoming departures; unavailable ones are disabled with a reason. */
export default function DepartureSelector({ pkg, departures, value, onChange, travellers }) {
  const name = useId();

  if (departures.length === 0) {
    return (
      <p className="departures-empty">
        <i className="bi bi-calendar-x" aria-hidden="true" /> There are no upcoming departures for this package right now. Check back
        soon or explore similar trips below.
      </p>
    );
  }

  return (
    <fieldset className="departures">
      <legend className="visually-hidden">Choose a departure date</legend>
      {departures.map((d) => {
        const bookable = isBookable(d, travellers);
        const soldOut = d.seatsRemaining === 0;
        const price = unitPrice(pkg, d);
        const reason = soldOut ? 'Sold out' : !bookable ? `Only ${d.seatsRemaining} left — fewer than ${travellers}` : null;
        return (
          <label key={d.id} className={`departure ${value === d.id ? 'is-selected' : ''} ${bookable ? '' : 'is-disabled'}`}>
            <input type="radio" name={name} value={d.id} checked={value === d.id} disabled={!bookable} onChange={() => onChange(d.id)} />
            <span className="departure__check" aria-hidden="true">
              <i className="bi bi-check-lg" />
            </span>
            <span className="departure__dates">
              <strong>
                {weekday(d.startDate)}, {formatDate(d.startDate)}
              </strong>
              <small>Returns {formatDate(d.endDate)}</small>
            </span>
            <span className="departure__meta">
              <span className="departure__price">
                {formatPrice(price, pkg.currency)}
                {d.pricePerPerson && d.pricePerPerson > pkg.basePrice && <em className="departure__peak">Peak</em>}
              </span>
              <span className={`departure__seats ${soldOut ? 'is-out' : d.seatsRemaining <= LOW_SEATS ? 'is-low' : ''}`}>
                {reason ?? seatsLabel(d)}
              </span>
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
