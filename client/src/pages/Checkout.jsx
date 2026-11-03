import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth } from '../context/authContext';
import { useToast } from '../context/toastContext';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cancelBooking, createBooking, quoteBooking } from '../services/bookings';
import { getDeparture } from '../services/catalog';
import { isBookable, seatsLabel } from '../utils/departures';
import { formatDate, formatDuration, formatPrice } from '../utils/format';
import { randomId } from '../utils/id';
import { MAX_TRAVELLERS } from '../utils/search';
import DemoPaymentPanel from '../components/booking/DemoPaymentPanel';
import ProgressSteps from '../components/booking/ProgressSteps';
import SuccessCheck from '../components/booking/SuccessCheck';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import SmartImage from '../components/ui/SmartImage';
import Stepper from '../components/ui/Stepper';
import TextField from '../components/ui/TextField';
import NotFound from './NotFound';
import './Checkout.css';

const STEPS = ['Departure', 'Travellers', 'Review', 'Payment', 'Confirmation'];
const EASE = [0.22, 1, 0.36, 1];

const slide = {
  enter: (dir) => ({ opacity: 0, x: dir * 48 }),
  center: { opacity: 1, x: 0 },
  exit: (dir) => ({ opacity: 0, x: dir * -48 }),
};

function validateTravellers(list) {
  return list.map((t) => ({
    ...(t.name.trim().length < 2 && { name: 'Enter the traveller’s full name.' }),
    ...(t.age !== '' && !(Number.isInteger(Number(t.age)) && Number(t.age) >= 0 && Number(t.age) <= 120) && { age: 'Age must be 0–120.' }),
  }));
}

function TripCard({ pkg, departure }) {
  return (
    <div className="checkout-trip">
      <div className="checkout-trip__img">
        <SmartImage src={pkg.images?.[0]?.url} alt={pkg.images?.[0]?.alt ?? ''} width={480} sizes="160px" />
      </div>
      <div>
        <p className="checkout-trip__place">
          {pkg.destination}, {pkg.country}
        </p>
        <h3 className="checkout-trip__title">{pkg.title}</h3>
        <p className="checkout-trip__dates">
          <i className="bi bi-calendar-event" aria-hidden="true" /> {formatDate(departure.startDate)} – {formatDate(departure.endDate)} ·{' '}
          {formatDuration(pkg.durationDays)}
        </p>
      </div>
    </div>
  );
}

function CheckoutFlow({ pkg, departure: initialDeparture, initialTravellers }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [count, setCount] = useState(initialTravellers);
  const [travellers, setTravellers] = useState(() =>
    Array.from({ length: MAX_TRAVELLERS }, (_, i) => ({ name: i === 0 ? user.name : '', age: '' })),
  );
  const [showErrors, setShowErrors] = useState(false);
  const [quote, setQuote] = useState(null);
  const [booking, setBooking] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  // One key per checkout attempt: retries of "Reserve" never create a second booking.
  const [idempotencyKey] = useState(randomId);
  const departure = initialDeparture;

  // Focus each new step's heading once it mounts (after the exit animation),
  // so keyboard/screen-reader users follow along. Skipped on first render.
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
  }, []);
  const focusHeading = useCallback((node) => {
    if (node && mounted.current) node.focus();
  }, []);

  const active = travellers.slice(0, count);
  const travellerErrors = validateTravellers(active);
  const maxSeats = Math.max(1, Math.min(MAX_TRAVELLERS, departure.seatsRemaining));

  const go = (next) => {
    setDirection(next > step ? 1 : -1);
    setError('');
    setStep(next);
  };

  const toReview = async () => {
    if (travellerErrors.some((e) => Object.keys(e).length)) {
      setShowErrors(true);
      const i = travellerErrors.findIndex((e) => Object.keys(e).length);
      document.getElementById(`traveller-${i}-${travellerErrors[i].name ? 'name' : 'age'}`)?.focus();
      return;
    }
    setBusy(true);
    try {
      setQuote(await quoteBooking(departure.id, count));
      go(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const reserve = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const created = await createBooking({
        departureId: departure.id,
        travellers: active.map((t) => ({ name: t.name.trim(), ...(t.age !== '' ? { age: Number(t.age) } : {}) })),
        idempotencyKey,
      });
      setBooking(created);
      go(3);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const releaseHold = async () => {
    setBusy(true);
    try {
      await cancelBooking(booking.id);
      toast({ tone: 'info', title: 'Seats released', message: 'Your reservation was cancelled. Nothing was charged.' });
      navigate(`/packages/${pkg.slug}`);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };

  const onPaid = (paidBooking) => {
    setBooking(paidBooking);
    toast({ tone: 'success', title: 'Booking confirmed', message: `Reference ${paidBooking.reference}` });
    go(4);
  };

  const heading = (text) => (
    <h2 ref={focusHeading} tabIndex={-1} className="checkout-step__title font-display">
      {text}
    </h2>
  );

  let panel;
  if (step === 0) {
    panel = (
      <>
        {heading('Confirm your departure')}
        <TripCard pkg={pkg} departure={departure} />
        <div className="checkout-row">
          <div>
            <p className="checkout-label">Seats available</p>
            <p className="checkout-value">{seatsLabel(departure)}</p>
          </div>
          <div>
            <label htmlFor="checkout-count" className="checkout-label">
              Travellers
            </label>
            <Stepper id="checkout-count" label="travellers" value={count} min={1} max={maxSeats} onChange={setCount} className="checkout-stepper" />
          </div>
        </div>
        <div className="checkout-actions">
          <Button to={`/packages/${pkg.slug}`} variant="ghost" icon="arrow-left">
            Back to package
          </Button>
          <Button variant="primary" iconEnd="arrow-right" onClick={() => go(1)} disabled={!isBookable(departure, count)}>
            Continue
          </Button>
        </div>
      </>
    );
  } else if (step === 1) {
    panel = (
      <>
        {heading('Who’s travelling?')}
        <p className="text-muted-hh">Enter names as they appear on travel documents.</p>
        <div className="checkout-travellers">
          {active.map((t, i) => (
            <fieldset key={i} className="checkout-traveller">
              <legend>Traveller {i + 1}</legend>
              <div className="row g-3">
                <div className="col-sm-8">
                  <TextField
                    id={`traveller-${i}-name`}
                    label="Full name"
                    autoComplete={i === 0 ? 'name' : 'off'}
                    maxLength={80}
                    value={t.name}
                    error={showErrors ? travellerErrors[i].name : undefined}
                    onChange={(e) => setTravellers((list) => list.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                  />
                </div>
                <div className="col-sm-4">
                  <TextField
                    id={`traveller-${i}-age`}
                    label="Age (optional)"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={120}
                    value={t.age}
                    error={showErrors ? travellerErrors[i].age : undefined}
                    onChange={(e) => setTravellers((list) => list.map((x, j) => (j === i ? { ...x, age: e.target.value } : x)))}
                  />
                </div>
              </div>
            </fieldset>
          ))}
        </div>
        <div className="checkout-actions">
          <Button variant="ghost" icon="arrow-left" onClick={() => go(0)}>
            Back
          </Button>
          <Button variant="primary" iconEnd="arrow-right" onClick={toReview} disabled={busy}>
            {busy ? 'Checking price…' : 'Review booking'}
          </Button>
        </div>
      </>
    );
  } else if (step === 2) {
    panel = (
      <>
        {heading('Review your booking')}
        <TripCard pkg={pkg} departure={departure} />
        <dl className="checkout-price">
          <div>
            <dt>Price per person</dt>
            <dd>{formatPrice(quote.unitPrice, quote.currency)}</dd>
          </div>
          <div>
            <dt>Travellers</dt>
            <dd>
              {count} — {active.map((t) => t.name.trim()).join(', ')}
            </dd>
          </div>
          <div className="checkout-price__total">
            <dt>Total</dt>
            <dd>{formatPrice(quote.totalAmount, quote.currency)}</dd>
          </div>
        </dl>
        <p className="checkout-note">
          <i className="bi bi-shield-lock" aria-hidden="true" /> Prices are verified by our server. Reserving holds your seats for {quote.holdMinutes} minutes
          while you complete the demo payment. Free cancellation up to 7 days before departure.
        </p>
        {!quote.available && (
          <div className="alert alert-warning" role="alert">
            Only {quote.seatsRemaining} seats are left now. Please go back and reduce the number of travellers.
          </div>
        )}
        <div className="checkout-actions">
          <Button variant="ghost" icon="arrow-left" onClick={() => go(1)} disabled={busy}>
            Back
          </Button>
          <Button variant="primary" icon="lock" onClick={reserve} disabled={busy || !quote.available}>
            {busy ? 'Reserving…' : 'Reserve seats & continue'}
          </Button>
        </div>
      </>
    );
  } else if (step === 3) {
    panel = (
      <>
        {heading('Payment')}
        <p className="text-muted-hh">
          Booking <strong>{booking.reference}</strong> is reserved for you.
        </p>
        <DemoPaymentPanel booking={booking} onPaid={onPaid} />
        <div className="checkout-actions checkout-actions--start">
          <Button variant="ghost" size="sm" icon="x-circle" onClick={releaseHold} disabled={busy}>
            Cancel and release my seats
          </Button>
        </div>
      </>
    );
  } else {
    panel = (
      <div className="checkout-done">
        <SuccessCheck />
        {heading('You’re going to ' + pkg.destination + '!')}
        <p className="checkout-done__ref">
          Booking reference <strong>{booking.reference}</strong>
        </p>
        <dl className="checkout-price checkout-price--compact">
          <div>
            <dt>Trip</dt>
            <dd>{pkg.title}</dd>
          </div>
          <div>
            <dt>Dates</dt>
            <dd>
              {formatDate(booking.startDate)} – {formatDate(booking.endDate)}
            </dd>
          </div>
          <div>
            <dt>Travellers</dt>
            <dd>{booking.travellers.map((t) => t.name).join(', ')}</dd>
          </div>
          <div className="checkout-price__total">
            <dt>Paid (demo)</dt>
            <dd>{formatPrice(booking.totalAmount, booking.currency)}</dd>
          </div>
        </dl>
        <div className="checkout-actions checkout-actions--center">
          <Button to="/my-bookings" variant="primary" iconEnd="arrow-right">
            View My Bookings
          </Button>
          <Button to="/packages" variant="outline">
            Explore more trips
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="checkout-card surface-card">
      <ProgressSteps steps={STEPS} current={step} />
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <div className="checkout-stage">
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.section
            key={step}
            custom={direction}
            variants={slide}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: EASE }}
            aria-label={`Step ${step + 1} of ${STEPS.length}: ${STEPS[step]}`}
          >
            {panel}
          </motion.section>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default function Checkout() {
  useDocumentTitle('Checkout');
  const { departureId } = useParams();
  const [params] = useSearchParams();
  const { data, error, loading, reload } = useAsync(() => getDeparture(departureId), [departureId]);
  const requested = Math.min(Math.max(Number.parseInt(params.get('travellers'), 10) || 1, 1), MAX_TRAVELLERS);

  if (error?.status === 404) return <NotFound title="Departure not found" message="This departure may have been removed or the link is incorrect." />;

  let body;
  if (error) {
    body = (
      <EmptyState icon="wifi-off" title="We couldn’t load this departure" actions={<Button variant="ocean" icon="arrow-clockwise" onClick={reload}>Try again</Button>}>
        <p>{error.message}</p>
      </EmptyState>
    );
  } else if (loading || !data) {
    body = <Skeleton height="420px" radius="var(--hh-radius-lg)" />;
  } else if (!isBookable(data.departure, 1)) {
    body = (
      <EmptyState
        icon="calendar-x"
        title="This departure can’t be booked"
        actions={<Button to={`/packages/${data.package.slug}`} variant="ocean" icon="arrow-left">Choose another date</Button>}
      >
        <p>It may be sold out or no longer open. Other dates for this trip may still be available.</p>
      </EmptyState>
    );
  } else {
    body = <CheckoutFlow pkg={data.package} departure={data.departure} initialTravellers={Math.min(requested, data.departure.seatsRemaining)} />;
  }

  return (
    <section className="checkout page-offset section-tight">
      <div className="container">
        <nav aria-label="Breadcrumb" className="checkout-crumb">
          <Link to="/packages">Packages</Link>
          {data && (
            <>
              <span aria-hidden="true">/</span>
              <Link to={`/packages/${data.package.slug}`}>{data.package.title}</Link>
            </>
          )}
          <span aria-hidden="true">/</span>
          <span aria-current="page">Checkout</span>
        </nav>
        <h1 className="checkout__title font-display">Book your trip</h1>
        {body}
      </div>
    </section>
  );
}
