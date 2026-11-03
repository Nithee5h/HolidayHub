import { useId, useState } from 'react';
import { useNavigate } from 'react-router';
import { destinations } from '../../data/destinations';
import { todayIso } from '../../utils/dates';
import { MAX_TRAVELLERS, budgetOptions, budgetToRange, buildSearchParams, rangeToBudget } from '../../utils/search';
import Button from '../ui/Button';
import Stepper from '../ui/Stepper';
import './SearchBar.css';

/**
 * Package search form. Submitting navigates to /packages with shareable query
 * params. `variant="glass"` floats over imagery; `variant="solid"` sits on light pages.
 * `destinationRef` points at the destination input (used by "Plan Your Trip").
 */
export default function SearchBar({ variant = 'glass', initial = {}, className = '', destinationRef }) {
  const navigate = useNavigate();
  const uid = useId();
  const [destination, setDestination] = useState(initial.destination ?? '');
  const [date, setDate] = useState(initial.date ?? '');
  const [travellers, setTravellers] = useState(initial.travellers ?? 2);
  const [budget, setBudget] = useState(rangeToBudget(initial.minPrice, initial.maxPrice));

  const handleSubmit = (event) => {
    event.preventDefault();
    // Read travellers from the form so a value typed just before Enter is included.
    const typed = Number.parseInt(new FormData(event.currentTarget).get('travellers'), 10);
    const params = buildSearchParams({
      destination,
      date,
      travellers: Number.isFinite(typed) ? Math.min(Math.max(typed, 1), MAX_TRAVELLERS) : travellers,
      ...budgetToRange(budget),
    });
    const query = params.toString();
    navigate(query ? `/packages?${query}` : '/packages');
  };

  const id = (name) => `${uid}-${name}`;

  return (
    <form className={`search-bar search-bar--${variant} ${className}`} onSubmit={handleSubmit} role="search" aria-label="Search holiday packages">
      <div className="search-bar__field search-bar__field--destination">
        <label htmlFor={id('destination')}>
          <i className="bi bi-geo-alt" aria-hidden="true" /> Destination
        </label>
        <input
          ref={destinationRef}
          id={id('destination')}
          type="text"
          list={id('destinations')}
          placeholder="Where do you want to go?"
          autoComplete="off"
          value={destination}
          onChange={(e) => setDestination(e.target.value)}
        />
        <datalist id={id('destinations')}>
          {destinations.map((d) => (
            <option key={d.slug} value={d.name}>
              {d.country}
            </option>
          ))}
        </datalist>
      </div>

      <div className="search-bar__field">
        <label htmlFor={id('date')}>
          <i className="bi bi-calendar3" aria-hidden="true" /> Travel date
        </label>
        <input id={id('date')} type="date" min={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} />
      </div>

      <div className="search-bar__field">
        <label htmlFor={id('travellers')}>
          <i className="bi bi-people" aria-hidden="true" /> Travellers
        </label>
        <Stepper
          id={id('travellers')}
          name="travellers"
          label="travellers"
          value={travellers}
          min={1}
          max={MAX_TRAVELLERS}
          onChange={setTravellers}
        />
      </div>

      <div className="search-bar__field">
        <label htmlFor={id('budget')}>
          <i className="bi bi-wallet2" aria-hidden="true" /> Budget / person
        </label>
        <select id={id('budget')} value={budget} onChange={(e) => setBudget(e.target.value)}>
          {budgetOptions.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>

      <Button type="submit" variant="primary" size="lg" icon="search" className="search-bar__submit">
        Search
      </Button>
    </form>
  );
}
