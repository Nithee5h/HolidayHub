import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { useToast } from '../context/toastContext';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { cancelBooking, getBooking } from '../services/bookings';
import { formatDate, formatPrice } from '../utils/format';
import DemoPaymentPanel from '../components/booking/DemoPaymentPanel';
import StatusBadge from '../components/booking/StatusBadge';
import Button from '../components/ui/Button';
import ConfirmDialog from '../components/ui/ConfirmDialog';
import EmptyState from '../components/ui/EmptyState';
import Skeleton from '../components/ui/Skeleton';
import SmartImage from '../components/ui/SmartImage';
import NotFound from './NotFound';
import './BookingDetails.css';

const PAYMENT_LABEL = { success_demo: 'Demo payment', failed_demo: 'Declined (demo)', refunded_demo: 'Refund (demo)' };
const REASON = { customer: 'Cancelled by you', admin: 'Cancelled by HolidayHub', hold_expired: 'Seat hold expired before payment' };
const when = (iso) => new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

function Details({ initial, onReload }) {
  const { toast } = useToast();
  const [booking, setBooking] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useDocumentTitle(`Booking ${booking.reference}`);

  const awaitingPayment = booking.bookingStatus === 'pending' && booking.paymentStatus === 'unpaid';
  const paid = booking.paymentStatus === 'paid_demo';

  const doCancel = async () => {
    setBusy(true);
    setError('');
    try {
      const updated = await cancelBooking(booking.id);
      setBooking(updated);
      setConfirming(false);
      toast({ tone: 'success', title: 'Booking cancelled', message: paid ? 'A demo refund has been recorded.' : 'Your seats were released.' });
    } catch (err) {
      setError(err.message);
      setConfirming(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="bd-header">
        <div>
          <p className="bd-header__ref">Booking {booking.reference}</p>
          <h1 className="bd-header__title font-display">{booking.packageTitle}</h1>
          <StatusBadge status={booking.tab === 'completed' && booking.bookingStatus === 'confirmed' ? 'completed' : booking.bookingStatus} payment={booking.paymentStatus} />
        </div>
        <Button to={`/packages/${booking.packageSlug}`} variant="outline" icon="box-arrow-up-right">
          View trip
        </Button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}

      <div className="row g-4 g-lg-5">
        <div className="col-lg-7">
          <div className="bd-photo">
            <SmartImage src={booking.coverImage?.url} alt={booking.coverImage?.alt ?? ''} width={1000} sizes="(min-width: 992px) 55vw, 100vw" />
          </div>

          {awaitingPayment && (
            <section className="surface-card p-4 mt-4" aria-labelledby="pay-title">
              <h2 id="pay-title" className="bd-section-title">
                Complete your payment
              </h2>
              <DemoPaymentPanel
                booking={booking}
                onPaid={(b) => {
                  setBooking(b);
                  toast({ tone: 'success', title: 'Booking confirmed', message: `Reference ${b.reference}` });
                }}
                onExpired={onReload}
              />
            </section>
          )}

          <section className="mt-4" aria-labelledby="travellers-title">
            <h2 id="travellers-title" className="bd-section-title">
              Travellers
            </h2>
            <ol className="bd-travellers">
              {booking.travellers.map((t, i) => (
                <li key={i}>
                  <span className="bd-travellers__n" aria-hidden="true">
                    {i + 1}
                  </span>
                  {t.name}
                  {t.age !== undefined && <small>Age {t.age}</small>}
                </li>
              ))}
            </ol>
          </section>
        </div>

        <aside className="col-lg-5" aria-label="Booking summary">
          <div className="surface-card p-4">
            <dl className="bd-summary">
              <div>
                <dt>Destination</dt>
                <dd>{booking.destination}</dd>
              </div>
              <div>
                <dt>Dates</dt>
                <dd>
                  {formatDate(booking.startDate)} – {formatDate(booking.endDate)}
                </dd>
              </div>
              <div>
                <dt>Price per person</dt>
                <dd>{formatPrice(booking.unitPriceSnapshot, booking.currency)}</dd>
              </div>
              <div>
                <dt>Travellers</dt>
                <dd>{booking.travellerCount}</dd>
              </div>
              <div className="bd-summary__total">
                <dt>Total</dt>
                <dd>{formatPrice(booking.totalAmount, booking.currency)}</dd>
              </div>
            </dl>

            {booking.payments?.length > 0 && (
              <>
                <h3 className="bd-subtitle">Payment history</h3>
                <ul className="bd-payments">
                  {booking.payments.map((p) => (
                    <li key={p.id}>
                      <span>
                        <strong>{PAYMENT_LABEL[p.status]}</strong>
                        <small>
                          {p.transactionReference} · {when(p.createdAt)}
                        </small>
                      </span>
                      <span className={p.status === 'refunded_demo' ? 'text-teal' : ''}>
                        {p.status === 'refunded_demo' ? '−' : ''}
                        {formatPrice(p.amount, p.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <h3 className="bd-subtitle">Cancellation policy (demo)</h3>
            {booking.bookingStatus === 'cancelled' ? (
              <p className="bd-policy">
                {REASON[booking.cancellationReason] ?? 'Cancelled'} on {when(booking.cancelledAt)}.
                {booking.paymentStatus === 'refunded_demo' && ' A demo refund was recorded.'}
              </p>
            ) : (
              <p className="bd-policy">
                Free cancellation until {formatDate(booking.cancellation.deadline)} ({booking.cancellation.cutoffDays} days before departure). Paid bookings
                receive a full demo refund; seats are released immediately.
              </p>
            )}
            {booking.cancellation.canCancel && (
              <Button variant="outline" icon="x-circle" block onClick={() => setConfirming(true)}>
                Cancel booking
              </Button>
            )}
          </div>
          <p className="mt-3">
            <Link to="/my-bookings">← Back to My Bookings</Link>
          </p>
        </aside>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Cancel this booking?"
        confirmLabel="Yes, cancel booking"
        busy={busy}
        onConfirm={doCancel}
        onClose={() => setConfirming(false)}
      >
        <p>
          {booking.packageTitle}, {formatDate(booking.startDate)} for {booking.travellerCount} {booking.travellerCount === 1 ? 'traveller' : 'travellers'}.
        </p>
        <p>{paid ? `A demo refund of ${formatPrice(booking.totalAmount, booking.currency)} will be recorded.` : 'Your held seats will be released.'} This can’t be undone.</p>
      </ConfirmDialog>
    </>
  );
}

export default function BookingDetails() {
  const { id } = useParams();
  const { data, error, loading, reload } = useAsync(() => getBooking(id), [id]);

  if (error?.status === 404) return <NotFound title="Booking not found" message="This booking doesn’t exist or isn’t linked to your account." />;

  return (
    <section className="page-offset section-tight">
      <div className="container">
        {error ? (
          <EmptyState icon="wifi-off" title="We couldn’t load this booking" actions={<Button variant="ocean" icon="arrow-clockwise" onClick={reload}>Try again</Button>}>
            <p>{error.message}</p>
          </EmptyState>
        ) : loading || !data ? (
          <Skeleton height="420px" radius="var(--hh-radius-lg)" />
        ) : (
          <Details key={`${data.id}-${data.bookingStatus}`} initial={data} onReload={reload} />
        )}
      </div>
    </section>
  );
}
