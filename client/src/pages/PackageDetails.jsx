import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getDepartures, getPackage, getRelatedPackages } from '../services/catalog';
import { addDays } from '../utils/dates';
import { DATE_WINDOW_DAYS, isBookable, nextBookable } from '../utils/departures';
import { formatDuration } from '../utils/format';
import { MAX_TRAVELLERS } from '../utils/search';
import BookingSummary from '../components/package/BookingSummary';
import DepartureSelector from '../components/package/DepartureSelector';
import Gallery from '../components/package/Gallery';
import ItineraryTimeline from '../components/package/ItineraryTimeline';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import { Reveal, RevealGroup, RevealItem } from '../components/ui/Reveal';
import PackageCard from '../components/travel/PackageCard';
import NotFound from './NotFound';
import './PackageDetails.css';

async function loadPackagePage(slug) {
  const [pkg, departures, related] = await Promise.all([getPackage(slug), getDepartures(slug), getRelatedPackages(slug)]);
  return { pkg, departures, related };
}

/** Pick the initial departure: first bookable one in the searched date window, else the next bookable. */
function initialDeparture(departures, travellers, date) {
  if (date) {
    const end = addDays(date, DATE_WINDOW_DAYS);
    const inWindow = departures.find((d) => d.startDate >= date && d.startDate <= end && isBookable(d, travellers));
    if (inWindow) return inWindow.id;
  }
  return nextBookable(departures, travellers)?.id ?? null;
}

function DetailsSkeleton() {
  return (
    <div className="container page-offset pb-5" aria-busy="true" aria-label="Loading package">
      <Skeleton width="30%" height="0.8rem" />
      <Skeleton width="60%" height="2.6rem" className="my-3" />
      <div className="row g-4 g-lg-5 mt-1">
        <div className="col-lg-8">
          <Skeleton height="420px" radius="var(--hh-radius-lg)" />
          <Skeleton width="40%" height="1.6rem" className="mt-5 mb-3" />
          <Skeleton height="0.9rem" className="mb-2" />
          <Skeleton width="80%" height="0.9rem" />
        </div>
        <div className="col-lg-4">
          <Skeleton height="360px" radius="var(--hh-radius)" />
        </div>
      </div>
    </div>
  );
}

function PackageView({ pkg, departures, related, initialTravellers, initialDate }) {
  useDocumentTitle(pkg.title);
  const [travellers, setTravellers] = useState(initialTravellers);
  const [selectedId, setSelectedId] = useState(() => initialDeparture(departures, initialTravellers, initialDate));
  const selected = departures.find((d) => d.id === selectedId) ?? null;

  const summaryProps = { pkg, departure: selected, travellers, onTravellersChange: setTravellers };

  return (
    <>
      <div className="container page-offset">
        <nav aria-label="Breadcrumb" className="pd-breadcrumb">
          <ol>
            <li>
              <Link to="/">Home</Link>
            </li>
            <li>
              <Link to="/packages">Packages</Link>
            </li>
            <li>
              <Link to={`/packages?destination=${encodeURIComponent(pkg.destination)}`}>{pkg.destination}</Link>
            </li>
            <li aria-current="page">{pkg.title}</li>
          </ol>
        </nav>

        <Reveal as="header" className="pd-header">
          <p className="pd-header__place">
            <i className="bi bi-geo-alt-fill" aria-hidden="true" /> {pkg.destination}, {pkg.country}
          </p>
          <h1 className="pd-header__title font-display">{pkg.title}</h1>
          <p className="pd-header__summary">{pkg.summary}</p>
        </Reveal>

        <div className="row g-4 g-lg-5">
          <div className="col-lg-8">
            <Gallery images={pkg.images} title={pkg.title} />

            <ul className="pd-facts" aria-label="Key facts">
              <li>
                <i className="bi bi-clock" aria-hidden="true" />
                <span>
                  <small>Duration</small>
                  {formatDuration(pkg.durationDays)}
                </span>
              </li>
              <li>
                <i className="bi bi-tag" aria-hidden="true" />
                <span>
                  <small>Category</small>
                  {pkg.category}
                </span>
              </li>
              <li>
                <i className="bi bi-geo" aria-hidden="true" />
                <span>
                  <small>Destination</small>
                  {pkg.destination}
                </span>
              </li>
              <li>
                <i className="bi bi-calendar-check" aria-hidden="true" />
                <span>
                  <small>Departures</small>
                  {departures.length} upcoming
                </span>
              </li>
            </ul>

            <Reveal as="section" className="pd-section" aria-labelledby="overview-title">
              <h2 id="overview-title" className="pd-heading font-display">
                Overview
              </h2>
              <p className="pd-lead">{pkg.description}</p>
            </Reveal>

            <Reveal as="section" className="pd-section" aria-labelledby="itinerary-title">
              <h2 id="itinerary-title" className="pd-heading font-display">
                Day-by-day itinerary
              </h2>
              <ItineraryTimeline itinerary={pkg.itinerary} />
            </Reveal>

            <Reveal as="section" className="pd-section" aria-labelledby="departures-title">
              <h2 id="departures-title" className="pd-heading font-display">
                Choose your departure
              </h2>
              <DepartureSelector pkg={pkg} departures={departures} value={selectedId} onChange={setSelectedId} travellers={travellers} />
            </Reveal>

            {/* Mobile: summary sits right after the date picker (not sticky). */}
            <div className="d-lg-none pd-section">
              <BookingSummary {...summaryProps} />
            </div>

            <Reveal as="section" className="pd-section" aria-labelledby="included-title">
              <h2 id="included-title" className="pd-heading font-display">
                What’s included
              </h2>
              <div className="row g-4">
                <div className="col-md-6">
                  <div className="surface-card p-4 h-100">
                    <h3 className="pd-subheading">
                      <i className="bi bi-check-circle-fill text-teal" aria-hidden="true" /> Included
                    </h3>
                    <ul className="pd-list pd-list--yes">
                      {pkg.inclusions.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="surface-card p-4 h-100">
                    <h3 className="pd-subheading">
                      <i className="bi bi-x-circle-fill text-coral" aria-hidden="true" /> Not included
                    </h3>
                    <ul className="pd-list pd-list--no">
                      {pkg.exclusions.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>

          <aside className="col-lg-4 d-none d-lg-block" aria-label="Booking summary">
            <BookingSummary {...summaryProps} className="booking-summary--sticky" />
          </aside>
        </div>
      </div>

      {related.length > 0 && (
        <section className="section-tight bg-sand mt-5" aria-labelledby="related-title">
          <div className="container">
            <h2 id="related-title" className="pd-heading font-display mb-4">
              You may also like
            </h2>
            <RevealGroup className="row g-4">
              {related.map((p) => (
                <RevealItem key={p.slug} className="col-md-6 col-xl-4">
                  <PackageCard pkg={p} />
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>
      )}
    </>
  );
}

export default function PackageDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { data, error, loading, reload } = useAsync(() => loadPackagePage(id), [id]);

  if (error?.status === 404) {
    return <NotFound title="Package not found" message="This package may have been removed or the link is incorrect." />;
  }
  if (error) {
    return (
      <div className="container page-offset">
        <EmptyState
          icon="wifi-off"
          title="We couldn’t load this package"
          actions={
            <Button variant="ocean" icon="arrow-clockwise" onClick={reload}>
              Try again
            </Button>
          }
        >
          <p>Please check your connection and try again.</p>
        </EmptyState>
      </div>
    );
  }
  if (loading || !data) return <DetailsSkeleton />;

  const travellers = Math.min(Math.max(Number.parseInt(searchParams.get('travellers'), 10) || 1, 1), MAX_TRAVELLERS);
  const date = /^\d{4}-\d{2}-\d{2}$/.test(searchParams.get('date') ?? '') ? searchParams.get('date') : '';

  return <PackageView key={id} {...data} initialTravellers={travellers} initialDate={date} />;
}
