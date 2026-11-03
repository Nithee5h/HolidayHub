import { useRef } from 'react';
import { Link, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { listMyBookings } from '../services/bookings';
import { formatDate, formatPrice } from '../utils/format';
import StatusBadge from '../components/booking/StatusBadge';
import HoldCountdown from '../components/booking/HoldCountdown';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import SmartImage from '../components/ui/SmartImage';
import './MyBookings.css';

const TABS = [
  { id: 'upcoming', label: 'Upcoming', empty: 'No upcoming trips yet', hint: 'When you book a holiday it will appear here.' },
  { id: 'completed', label: 'Completed', empty: 'No completed trips', hint: 'Trips move here after you return.' },
  { id: 'cancelled', label: 'Cancelled', empty: 'Nothing cancelled', hint: 'Cancelled bookings and expired holds are listed here.' },
];

function BookingCard({ booking, onExpire }) {
  const awaitingPayment = booking.bookingStatus === 'pending' && booking.paymentStatus === 'unpaid';
  return (
    <article className="trip-card">
      <div className="trip-card__img">
        <SmartImage src={booking.coverImage?.url} alt={booking.coverImage?.alt ?? ''} width={600} sizes="(min-width: 768px) 240px, 100vw" />
      </div>
      <div className="trip-card__body">
        <div className="trip-card__top">
          <StatusBadge status={booking.bookingStatus === 'confirmed' && booking.tab === 'completed' ? 'completed' : booking.bookingStatus} payment={booking.paymentStatus} />
          <span className="trip-card__ref">{booking.reference}</span>
        </div>
        <h3 className="trip-card__title">
          <Link to={`/my-bookings/${booking.id}`} className="stretched-link">
            {booking.packageTitle}
          </Link>
        </h3>
        <ul className="trip-card__meta">
          <li>
            <i className="bi bi-calendar-event" aria-hidden="true" /> {formatDate(booking.startDate)} – {formatDate(booking.endDate)}
          </li>
          <li>
            <i className="bi bi-people" aria-hidden="true" /> {booking.travellerCount} {booking.travellerCount === 1 ? 'traveller' : 'travellers'}
          </li>
          <li>
            <i className="bi bi-wallet2" aria-hidden="true" /> {formatPrice(booking.totalAmount, booking.currency)}
          </li>
        </ul>
        {awaitingPayment && booking.holdExpiresAt && (
          <p className="trip-card__hold">
            <HoldCountdown expiresAt={booking.holdExpiresAt} onExpire={onExpire} /> — open the booking to complete the demo payment.
          </p>
        )}
      </div>
    </article>
  );
}

export default function MyBookings() {
  useDocumentTitle('My Bookings');
  const [params, setParams] = useSearchParams();
  const tab = TABS.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'upcoming';
  const { data, error, reload } = useAsync(listMyBookings, []);
  const tabRefs = useRef([]);

  const counts = Object.fromEntries(TABS.map((t) => [t.id, (data ?? []).filter((b) => b.tab === t.id).length]));
  const items = (data ?? []).filter((b) => b.tab === tab);
  const current = TABS.find((t) => t.id === tab);

  const select = (id) => setParams(id === 'upcoming' ? {} : { tab: id }, { replace: true });
  const onTabKey = (e, index) => {
    const next = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: TABS.length - 1 }[e.key];
    if (next === undefined) return;
    e.preventDefault();
    const i = (next + TABS.length) % TABS.length;
    select(TABS[i].id);
    tabRefs.current[i]?.focus();
  };

  let panel;
  if (error && !data) {
    panel = (
      <EmptyState icon="wifi-off" title="We couldn’t load your bookings" actions={<Button variant="ocean" icon="arrow-clockwise" onClick={reload}>Try again</Button>}>
        <p>{error.message}</p>
      </EmptyState>
    );
  } else if (!data) {
    panel = (
      <div className="d-grid gap-3" aria-busy="true" aria-label="Loading bookings">
        <Skeleton height="170px" radius="var(--hh-radius-lg)" />
        <Skeleton height="170px" radius="var(--hh-radius-lg)" />
      </div>
    );
  } else if (items.length === 0) {
    panel = (
      <EmptyState icon={tab === 'upcoming' ? 'suitcase2' : tab === 'completed' ? 'flag' : 'calendar-x'} title={current.empty} actions={tab === 'upcoming' && <Button to="/packages" variant="primary" iconEnd="arrow-right">Find a trip</Button>}>
        <p>{current.hint}</p>
      </EmptyState>
    );
  } else {
    panel = (
      <div className="d-grid gap-3">
        <AnimatePresence initial={false}>
          {items.map((b, i) => (
            <motion.div key={b.id} layout initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }} exit={{ opacity: 0 }}>
              <BookingCard booking={b} onExpire={reload} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <>
      <PageHeader eyebrow="Your trips" title="My Bookings" subtitle="Upcoming adventures, past trips and cancellations in one place." />
      <section className="section-tight">
        <div className="container">
          <div className="trip-tabs" role="tablist" aria-label="Booking status">
            {TABS.map((t, i) => (
              <button
                key={t.id}
                ref={(el) => {
                  tabRefs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`tab-${t.id}`}
                aria-selected={tab === t.id}
                aria-controls="trip-panel"
                tabIndex={tab === t.id ? 0 : -1}
                className={`trip-tabs__tab ${tab === t.id ? 'is-active' : ''}`}
                onClick={() => select(t.id)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                {t.label}
                {data && (
                  <>
                    <span className="trip-tabs__count" aria-hidden="true">
                      {counts[t.id]}
                    </span>
                    <span className="visually-hidden">
                      , {counts[t.id]} {counts[t.id] === 1 ? 'booking' : 'bookings'}
                    </span>
                  </>
                )}
                {tab === t.id && <motion.span layoutId="trip-tab-indicator" className="trip-tabs__indicator" transition={{ type: 'spring', stiffness: 420, damping: 34 }} />}
              </button>
            ))}
          </div>
          <div id="trip-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="trip-panel">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
                {panel}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </section>
    </>
  );
}
