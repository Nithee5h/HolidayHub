import { useState } from 'react';
import { useSearchParams } from 'react-router';
import { useToast } from '../../context/toastContext';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { changeBookingStatus, listBookingsAdmin } from '../../services/admin';
import { todayIso } from '../../utils/dates';
import { formatDate, formatPrice } from '../../utils/format';
import StatusBadge from '../../components/booking/StatusBadge';
import Button from '../../components/ui/Button';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import TableScroll from '../../components/ui/TableScroll';

/** Transitions the API accepts (see adminService.changeBookingStatus). */
function allowedTransitions(b) {
  const options = [];
  if (['pending', 'confirmed'].includes(b.bookingStatus)) options.push('cancelled');
  if (b.bookingStatus === 'confirmed' && b.startDate <= todayIso()) options.push('completed');
  return options;
}

const ACTION_TEXT = {
  cancelled: { label: 'Cancel booking', help: (b) => (b.paymentStatus === 'paid_demo' ? `Records a demo refund of ${formatPrice(b.totalAmount)} and releases ${b.travellerCount} seat(s).` : `Releases ${b.travellerCount} held seat(s).`) },
  completed: { label: 'Mark as completed', help: () => 'Use once the trip has taken place.' },
};

export default function AdminBookings() {
  useDocumentTitle('Manage bookings');
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const filters = { q: params.get('q') ?? '', status: params.get('status') ?? '', from: params.get('from') ?? '', to: params.get('to') ?? '', page: Number(params.get('page')) || 1 };
  const [query, setQuery] = useState(filters.q);
  const [action, setAction] = useState(null); // { booking, status }
  const [busy, setBusy] = useState(false);
  const { data, error, stale, reload } = useAsync(() => listBookingsAdmin(filters), [params.toString()]);

  const setFilter = (changes) => {
    const next = new URLSearchParams(params);
    Object.entries({ page: '', ...changes }).forEach(([k, v]) => (v ? next.set(k, String(v)) : next.delete(k)));
    setParams(next, { replace: true });
  };

  const apply = async () => {
    setBusy(true);
    try {
      const updated = await changeBookingStatus(action.booking.id, action.status);
      toast({ tone: 'success', title: `Booking ${updated.reference} ${updated.bookingStatus}`, message: updated.paymentStatus === 'refunded_demo' ? 'Demo refund recorded.' : undefined });
      setAction(null);
      reload();
    } catch (err) {
      toast({ tone: 'error', title: 'Status not changed', message: err.message });
      setAction(null);
    } finally {
      setBusy(false);
    }
  };

  let body;
  if (error && !data) {
    body = <EmptyState icon="wifi-off" title="Couldn’t load bookings" actions={<Button variant="ocean" icon="arrow-clockwise" onClick={reload}>Try again</Button>}><p>{error.message}</p></EmptyState>;
  } else if (!data) {
    body = <Skeleton height="320px" radius="var(--hh-radius-lg)" />;
  } else if (data.items.length === 0) {
    body = <EmptyState icon="journal" title="No bookings match these filters" />;
  } else {
    body = (
      <TableScroll label="Bookings table" className={`admin-panel p-0 packages-results ${stale ? 'is-stale' : ''}`}>
        <table className="table admin-table">
          <caption className="visually-hidden">Bookings</caption>
          <thead>
            <tr>
              <th scope="col">Reference</th>
              <th scope="col">Customer</th>
              <th scope="col">Trip</th>
              <th scope="col">Travellers</th>
              <th scope="col">Total</th>
              <th scope="col">Status</th>
              <th scope="col">
                <span className="visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {data.items.map((b) => {
              const options = allowedTransitions(b);
              return (
                <tr key={b.id}>
                  <td className="fw-semibold">
                    {b.reference}
                    <small>Booked {new Date(b.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</small>
                  </td>
                  <td>
                    {b.customer?.name ?? '—'}
                    <small>{b.customer?.email}</small>
                  </td>
                  <td>
                    {b.packageTitle}
                    <small>
                      {formatDate(b.startDate)} – {formatDate(b.endDate)}
                    </small>
                  </td>
                  <td>{b.travellerCount}</td>
                  <td>{formatPrice(b.totalAmount, b.currency)}</td>
                  <td>
                    <StatusBadge status={b.bookingStatus} payment={b.paymentStatus} />
                  </td>
                  <td>
                    <div className="row-actions">
                      {options.length === 0 ? (
                        <span className="text-muted-hh small">No actions</span>
                      ) : (
                        options.map((s) => (
                          <Button key={s} variant={s === 'cancelled' ? 'ghost' : 'outline'} size="sm" onClick={() => setAction({ booking: b, status: s })} aria-label={`${s === 'cancelled' ? 'Cancel' : 'Complete'} booking ${b.reference}`}>
                            {s === 'cancelled' ? 'Cancel' : 'Complete'}
                          </Button>
                        ))
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </TableScroll>
    );
  }

  return (
    <>
      <div className="admin-page-title">
        <div>
          <h1 className="font-display">
            Bookings {data && <span className="admin-count">{data.total}</span>}
          </h1>
          <p>Search, filter and update booking status. Payments and refunds are simulated.</p>
        </div>
      </div>

      <form
        className="admin-filters"
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          setFilter({ q: query.trim() });
        }}
      >
        <div className="admin-filters__search">
          <label htmlFor="bk-q">Search</label>
          <input id="bk-q" className="form-control" type="search" placeholder="Reference, customer, trip" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div>
          <label htmlFor="bk-status">Status</label>
          <select id="bk-status" className="form-select" value={filters.status} onChange={(e) => setFilter({ status: e.target.value })}>
            <option value="">All</option>
            <option value="pending">Awaiting payment</option>
            <option value="confirmed">Confirmed</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        <div>
          <label htmlFor="bk-from">Departs from</label>
          <input id="bk-from" className="form-control" type="date" value={filters.from} onChange={(e) => setFilter({ from: e.target.value })} />
        </div>
        <div>
          <label htmlFor="bk-to">Departs to</label>
          <input id="bk-to" className="form-control" type="date" min={filters.from || undefined} value={filters.to} onChange={(e) => setFilter({ to: e.target.value })} />
        </div>
        <Button type="submit" variant="ocean" icon="search">
          Search
        </Button>
      </form>

      {body}

      {data && data.pages > 1 && (
        <nav className="d-flex justify-content-center align-items-center gap-2 mt-3" aria-label="Booking pages">
          <Button variant="outline" size="sm" disabled={data.page <= 1} onClick={() => setFilter({ page: data.page - 1 })}>
            Previous
          </Button>
          <span className="text-muted-hh">
            Page {data.page} of {data.pages}
          </span>
          <Button variant="outline" size="sm" disabled={data.page >= data.pages} onClick={() => setFilter({ page: data.page + 1 })}>
            Next
          </Button>
        </nav>
      )}

      <ConfirmDialog
        open={Boolean(action)}
        title={action ? `${ACTION_TEXT[action.status].label}?` : ''}
        confirmLabel={action ? ACTION_TEXT[action.status].label : ''}
        tone={action?.status === 'cancelled' ? 'danger' : 'neutral'}
        busy={busy}
        onConfirm={apply}
        onClose={() => setAction(null)}
      >
        {action && (
          <>
            <p>
              <strong>{action.booking.reference}</strong> · {action.booking.packageTitle} · {action.booking.customer?.name}
            </p>
            <p>{ACTION_TEXT[action.status].help(action.booking)}</p>
          </>
        )}
      </ConfirmDialog>
    </>
  );
}
