import { Link } from 'react-router';
import { useAsync } from '../../hooks/useAsync';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { getStats } from '../../services/admin';
import { formatPrice } from '../../utils/format';
import BarChart from '../../components/admin/BarChart';
import RankedBars from '../../components/admin/RankedBars';
import StatCard from '../../components/admin/StatCard';
import StatusBadge from '../../components/booking/StatusBadge';
import Button from '../../components/ui/Button';
import EmptyState from '../../components/ui/EmptyState';
import Skeleton from '../../components/ui/Skeleton';
import TableScroll from '../../components/ui/TableScroll';

const monthLabel = (ym) => new Date(`${ym}-01T00:00:00`).toLocaleDateString('en-IN', { month: 'short' });
const compactInr = (v) => (v >= 100000 ? `₹${(v / 100000).toFixed(v % 100000 ? 1 : 0)}L` : v >= 1000 ? `₹${Math.round(v / 1000)}k` : `₹${v}`);

export default function AdminDashboard() {
  useDocumentTitle('Admin dashboard');
  const { data: s, error, reload } = useAsync(getStats, []);

  if (error && !s) {
    return (
      <EmptyState icon="wifi-off" title="Couldn’t load dashboard" actions={<Button variant="ocean" icon="arrow-clockwise" onClick={reload}>Try again</Button>}>
        <p>{error.message}</p>
      </EmptyState>
    );
  }

  return (
    <>
      <div className="admin-page-title">
        <div>
          <h1 className="font-display">Dashboard</h1>
          <p>Bookings, packages and simulated revenue at a glance.</p>
        </div>
        <Button to="/admin/packages/new" variant="primary" icon="plus-lg">
          New package
        </Button>
      </div>

      {!s ? (
        <div className="stat-grid" aria-busy="true" aria-label="Loading metrics">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} height="112px" radius="var(--hh-radius-lg)" />
          ))}
        </div>
      ) : (
        <>
          <div className="stat-grid">
            <StatCard icon="collection" label="Packages" value={s.packages.total} hint={`${s.packages.published ?? 0} published · ${s.packages.draft ?? 0} draft`} />
            <StatCard icon="journal-check" label="Bookings" value={s.bookings.total} hint={`${s.bookings.confirmed ?? 0} confirmed · ${s.bookings.pending ?? 0} awaiting payment`} />
            <StatCard icon="people" label="Customers" value={s.customers} hint={`${s.upcomingDepartures} upcoming departures`} />
            <StatCard icon="cash-coin" label="Revenue (simulated)" value={s.revenueDemo} format={(n) => formatPrice(n)} hint={`${s.travellersPaid} paid travellers · demo payments only`} />
          </div>

          <div className="row g-3 mb-3">
            <div className="col-xl-7">
              <section className="admin-panel h-100" aria-labelledby="chart-revenue">
                <h2 id="chart-revenue" className="admin-panel__title">
                  Simulated revenue by month
                </h2>
                <BarChart
                  title="Simulated revenue by month (paid demo bookings)"
                  data={s.monthly.map((m) => ({
                    label: monthLabel(m.month),
                    value: m.revenue,
                    detail: `${formatPrice(m.revenue)} · ${m.bookings} booking${m.bookings === 1 ? '' : 's'}`,
                  }))}
                  formatValue={(v) => formatPrice(v)}
                  formatTick={compactInr}
                />
              </section>
            </div>
            <div className="col-xl-5">
              <section className="admin-panel h-100" aria-labelledby="chart-dest">
                <h2 id="chart-dest" className="admin-panel__title">
                  Bookings by destination
                </h2>
                <RankedBars
                  title="Active bookings by destination"
                  unit=""
                  items={s.topDestinations.map((d) => ({ label: d.destination, value: d.bookings, extra: `${d.travellers} travellers` }))}
                />
              </section>
            </div>
          </div>

          <section className="admin-panel" aria-labelledby="recent-title">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <h2 id="recent-title" className="admin-panel__title mb-0">
                Recent bookings
              </h2>
              <Link to="/admin/bookings">View all</Link>
            </div>
            {s.recentBookings.length === 0 ? (
              <p className="chart__empty">No bookings yet.</p>
            ) : (
              <TableScroll label="Recent bookings table">
                <table className="table admin-table">
                  <caption className="visually-hidden">Five most recent bookings</caption>
                  <thead>
                    <tr>
                      <th scope="col">Reference</th>
                      <th scope="col">Customer</th>
                      <th scope="col">Trip</th>
                      <th scope="col">Total</th>
                      <th scope="col">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.recentBookings.map((b) => (
                      <tr key={b.id}>
                        <td className="fw-semibold">{b.reference}</td>
                        <td>
                          {b.customer?.name ?? '—'}
                          <small>{b.customer?.email}</small>
                        </td>
                        <td>{b.packageTitle}</td>
                        <td>{formatPrice(b.totalAmount)}</td>
                        <td>
                          <StatusBadge status={b.bookingStatus} payment={b.paymentStatus} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </section>
        </>
      )}
    </>
  );
}
