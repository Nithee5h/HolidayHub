import { useCallback, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { photos } from '../data/images';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { listPackages } from '../services/catalog';
import { formatDate, formatPrice } from '../utils/format';
import { buildSearchParams, durationOptions, parseSearchParams, sortOptions } from '../utils/search';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import Drawer from '../components/ui/Drawer';
import EmptyState from '../components/ui/EmptyState';
import FilterPanel from '../components/travel/FilterPanel';
import PackageCard from '../components/travel/PackageCard';
import PackageCardSkeleton from '../components/travel/PackageCardSkeleton';
import './Packages.css';

const SKELETON_COUNT = 6;

function describeFilters(f) {
  const chips = [];
  if (f.destination) chips.push({ keys: ['destination'], label: `“${f.destination}”`, icon: 'geo-alt' });
  if (f.category) chips.push({ keys: ['category'], label: f.category, icon: 'tag' });
  if (f.theme) chips.push({ keys: ['theme'], label: `Theme: ${f.theme}`, icon: 'stars' });
  if (f.minPrice !== undefined || f.maxPrice !== undefined) {
    const label =
      f.maxPrice === undefined ? `${formatPrice(f.minPrice)}+` : `${formatPrice(f.minPrice ?? 0)} – ${formatPrice(f.maxPrice)}`;
    chips.push({ keys: ['minPrice', 'maxPrice'], label, icon: 'wallet2' });
  }
  if (f.duration) {
    const option = durationOptions.find((o) => o.value === f.duration);
    chips.push({ keys: ['duration'], label: option.label, icon: 'clock' });
  }
  if (f.date) chips.push({ keys: ['date'], label: `From ${formatDate(f.date)}`, icon: 'calendar3' });
  if (f.travellers) chips.push({ keys: ['travellers'], label: `${f.travellers} ${f.travellers === 1 ? 'seat' : 'seats'}`, icon: 'people' });
  return chips;
}

export default function Packages() {
  useDocumentTitle('Holiday Packages');
  const [searchParams, setSearchParams] = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterButtonRef = useRef(null);

  const query = searchParams.toString();
  const filters = useMemo(() => parseSearchParams(new URLSearchParams(query)), [query]);
  const { data, error, loading, stale, reload } = useAsync(() => listPackages(filters), [query]);
  const results = data?.items ?? [];
  const activeChips = describeFilters(filters);

  // Functional update so debounced inputs never overwrite newer changes.
  const update = useCallback(
    (changes) => setSearchParams((prev) => buildSearchParams({ ...parseSearchParams(prev), ...changes })),
    [setSearchParams],
  );
  const removeKeys = (keys) => update(Object.fromEntries(keys.map((k) => [k, undefined])));
  const clearAll = () => setSearchParams({});
  const closeFilters = useCallback(() => setFiltersOpen(false), []);

  // Carry the party size / date into details links so the booking summary is prefilled.
  const linkSearch = buildSearchParams({ travellers: filters.travellers, date: filters.date }).toString();

  let content;
  if (error && !data) {
    content = (
      <EmptyState
        icon="wifi-off"
        title="We couldn’t load packages"
        actions={
          <Button variant="ocean" icon="arrow-clockwise" onClick={reload}>
            Try again
          </Button>
        }
      >
        <p>Please check your connection and try again.</p>
      </EmptyState>
    );
  } else if (!data) {
    content = (
      <div className="row g-4" aria-busy="true" aria-label="Loading packages">
        {Array.from({ length: SKELETON_COUNT }, (_, i) => (
          <div key={i} className="col-md-6 col-xxl-4">
            <PackageCardSkeleton />
          </div>
        ))}
      </div>
    );
  } else if (results.length === 0) {
    content = (
      <EmptyState
        icon="search"
        title="No packages match your search"
        actions={
          <>
            <Button variant="ocean" icon="arrow-counterclockwise" onClick={clearAll}>
              Clear all filters
            </Button>
            <Button to="/destinations" variant="outline">
              Explore destinations
            </Button>
          </>
        }
      >
        <p>Try a different destination, widen your budget, pick another date or remove a filter.</p>
      </EmptyState>
    );
  } else {
    content = (
      <motion.div layout className={`row g-4 packages-results ${stale ? 'is-stale' : ''}`} aria-busy={loading}>
        <AnimatePresence mode="popLayout" initial={false}>
          {results.map((pkg, i) => (
            <motion.div
              key={pkg.slug}
              layout
              className="col-md-6 col-xxl-4"
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0, transition: { duration: 0.4, delay: Math.min(i, 6) * 0.05 } }}
              exit={{ opacity: 0, scale: 0.96, transition: { duration: 0.2 } }}
            >
              <PackageCard pkg={pkg} linkSearch={linkSearch} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Holiday packages"
        title="Find your perfect getaway"
        subtitle="Search by destination, set your budget and compare day-by-day itineraries."
        photo={photos.lakeBoat}
      />

      <section className="section-tight packages-page">
        <div className="container">
          <div className="row g-4 g-lg-5">
            <aside className="col-lg-4 col-xl-3 d-none d-lg-block" aria-label="Filters">
              <div className="packages-sidebar surface-card">
                <FilterPanel filters={filters} onChange={update} />
              </div>
            </aside>

            <div className="col-lg-8 col-xl-9">
              <div className="packages-toolbar">
                <p className="packages-toolbar__count" aria-live="polite">
                  {data ? (
                    <>
                      <strong>{results.length}</strong> {results.length === 1 ? 'package' : 'packages'} found
                    </>
                  ) : (
                    'Loading packages…'
                  )}
                </p>
                <div className="packages-toolbar__controls">
                  <Button
                    ref={filterButtonRef}
                    variant="outline"
                    size="sm"
                    icon="sliders"
                    className="d-lg-none"
                    aria-haspopup="dialog"
                    aria-expanded={filtersOpen}
                    onClick={() => setFiltersOpen(true)}
                  >
                    Filters{activeChips.length > 0 ? ` (${activeChips.length})` : ''}
                  </Button>
                  <label htmlFor="sort" className="visually-hidden">
                    Sort packages
                  </label>
                  <select id="sort" className="form-select packages-toolbar__sort" value={filters.sort} onChange={(e) => update({ sort: e.target.value || undefined })}>
                    {sortOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.value ? o.label : 'Sort: Recommended'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <h2 className="visually-hidden">Results</h2>
              {activeChips.length > 0 && (
                <ul className="packages-chips" aria-label="Active filters">
                  {activeChips.map((chip) => (
                    <li key={chip.keys.join()}>
                      <button type="button" className="filter-pill" onClick={() => removeKeys(chip.keys)} aria-label={`Remove filter ${chip.label}`}>
                        <i className={`bi bi-${chip.icon}`} aria-hidden="true" /> {chip.label}
                        <i className="bi bi-x" aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                  <li>
                    <button type="button" className="filter-pill filter-pill--clear" onClick={clearAll}>
                      Clear all
                    </button>
                  </li>
                </ul>
              )}

              {content}
            </div>
          </div>
        </div>
      </section>

      <Drawer
        open={filtersOpen}
        onClose={closeFilters}
        title="Filters"
        id="filters-drawer"
        returnFocusRef={filterButtonRef}
        footer={
          <>
            <Button variant="outline" onClick={clearAll}>
              Clear all
            </Button>
            <Button variant="ocean" onClick={closeFilters}>
              Show {results.length} {results.length === 1 ? 'result' : 'results'}
            </Button>
          </>
        }
      >
        <FilterPanel filters={filters} onChange={update} />
      </Drawer>
    </>
  );
}
