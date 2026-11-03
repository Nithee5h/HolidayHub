import { useEffect, useId, useRef, useState } from 'react';
import { categories, destinations } from '../../data/destinations';
import { todayIso } from '../../utils/dates';
import { DATE_WINDOW_DAYS } from '../../utils/departures';
import { MAX_TRAVELLERS, budgetOptions, budgetToRange, durationOptions, rangeToBudget } from '../../utils/search';
import './FilterPanel.css';

const DEBOUNCE_MS = 350;

function RadioGroup({ legend, name, options, value, onChange }) {
  return (
    <fieldset className="filter-group">
      <legend className="filter-group__legend">{legend}</legend>
      <div className="filter-options">
        {options.map((o) => (
          <label key={o.value} className={`filter-option ${value === o.value ? 'is-checked' : ''}`}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} />
            <span>{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * Controlled filter form for /packages. `filters` comes from the URL;
 * `onChange(partial)` writes back to it. Text search is debounced.
 */
export default function FilterPanel({ filters, onChange }) {
  const uid = useId();
  const timer = useRef(0);
  const [text, setText] = useState(filters.destination);
  const [prevDestination, setPrevDestination] = useState(filters.destination);
  // Keep the input in sync when the URL changes elsewhere (chips, "Clear all").
  if (filters.destination !== prevDestination) {
    setPrevDestination(filters.destination);
    setText(filters.destination);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const onTextChange = (value) => {
    setText(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => onChange({ destination: value.trim() || undefined }), DEBOUNCE_MS);
  };

  const commitText = () => {
    clearTimeout(timer.current);
    if (text.trim() !== filters.destination) onChange({ destination: text.trim() || undefined });
  };

  return (
    <form className="filter-panel" onSubmit={(e) => e.preventDefault()} aria-label="Package filters">
      <div className="filter-group">
        <label htmlFor={`${uid}-q`} className="filter-group__legend">
          Destination
        </label>
        <div className="filter-search">
          <i className="bi bi-search" aria-hidden="true" />
          <input
            id={`${uid}-q`}
            type="search"
            className="form-control"
            placeholder="Kerala, Bali, Paris…"
            list={`${uid}-destinations`}
            autoComplete="off"
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            onBlur={commitText}
            onKeyDown={(e) => e.key === 'Enter' && commitText()}
          />
          <datalist id={`${uid}-destinations`}>
            {destinations.map((d) => (
              <option key={d.slug} value={d.name} />
            ))}
          </datalist>
        </div>
      </div>

      <RadioGroup
        legend="Category"
        name={`${uid}-category`}
        options={[{ value: '', label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]}
        value={filters.category}
        onChange={(category) => onChange({ category: category || undefined })}
      />

      <RadioGroup
        legend="Budget per person"
        name={`${uid}-budget`}
        options={budgetOptions}
        value={rangeToBudget(filters.minPrice, filters.maxPrice)}
        onChange={(budget) => onChange({ minPrice: undefined, maxPrice: undefined, ...budgetToRange(budget) })}
      />

      <RadioGroup
        legend="Trip length"
        name={`${uid}-duration`}
        options={durationOptions}
        value={filters.duration}
        onChange={(duration) => onChange({ duration: duration || undefined })}
      />

      <fieldset className="filter-group">
        <legend className="filter-group__legend">Availability</legend>
        <label htmlFor={`${uid}-date`} className="filter-label">
          Departing from
        </label>
        <div className="d-flex gap-2">
          <input
            id={`${uid}-date`}
            type="date"
            className="form-control"
            min={todayIso()}
            value={filters.date}
            onChange={(e) => onChange({ date: e.target.value || undefined })}
          />
          {filters.date && (
            <button type="button" className="filter-clear" onClick={() => onChange({ date: undefined })} aria-label="Clear departure date">
              <i className="bi bi-x-lg" aria-hidden="true" />
            </button>
          )}
        </div>
        <label htmlFor={`${uid}-travellers`} className="filter-label mt-3">
          Seats needed
        </label>
        <select
          id={`${uid}-travellers`}
          className="form-select"
          value={filters.travellers ?? ''}
          onChange={(e) => onChange({ travellers: e.target.value || undefined })}
        >
          <option value="">Any</option>
          {Array.from({ length: MAX_TRAVELLERS }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? 'traveller' : 'travellers'}
            </option>
          ))}
        </select>
        <p className="filter-hint">
          {filters.date
            ? `Shows packages with seats on a departure within ${DATE_WINDOW_DAYS} days of your date.`
            : 'Set a date or party size to only show packages with seats available.'}
        </p>
      </fieldset>
    </form>
  );
}
