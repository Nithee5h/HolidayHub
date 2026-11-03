import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../../App';
import { ApiError } from '../../services/ApiError';
import { adminUser, authMock, customerUser } from '../../test/authMock';
import { kerala } from '../../test/fixtures';
import { addDays, todayIso } from '../../utils/dates';

vi.mock('../../services/auth', async () => (await import('../../test/authMock')).authMock.module);
const api = vi.hoisted(() => ({
  getStats: vi.fn(),
  listCustomers: vi.fn(),
  listPackagesAdmin: vi.fn(),
  getPackageAdmin: vi.fn(),
  createPackage: vi.fn(),
  updatePackage: vi.fn(),
  removePackage: vi.fn(),
  listDepartures: vi.fn(),
  createDeparture: vi.fn(),
  updateDeparture: vi.fn(),
  listBookingsAdmin: vi.fn(),
  changeBookingStatus: vi.fn(),
}));
vi.mock('../../services/admin', () => api);

function Where() {
  const l = useLocation();
  return <output data-testid="where">{l.pathname + l.search}</output>;
}
const renderAt = (route) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
      <Where />
    </MemoryRouter>,
  );

const stats = {
  packages: { total: 11, published: 10, draft: 1 },
  bookings: { total: 3, confirmed: 2, pending: 1 },
  customers: 4,
  upcomingDepartures: 22,
  revenueDemo: 99996,
  travellersPaid: 4,
  monthly: ['2026-05', '2026-06', '2026-07', '2026-08', '2026-09', '2026-10'].map((month, i) => ({ month, bookings: i === 5 ? 2 : 0, revenue: i === 5 ? 99996 : 0 })),
  topDestinations: [{ destination: 'Kerala', bookings: 2, travellers: 4 }],
  recentBookings: [{ id: 'b1', reference: 'HH-AAAA1111', packageTitle: kerala.title, customer: { name: 'Asha Rao', email: 'asha@example.com' }, bookingStatus: 'confirmed', paymentStatus: 'paid_demo', totalAmount: 49998 }],
};

beforeEach(() => {
  authMock.reset({ user: adminUser });
  Object.values(api).forEach((fn) => fn.mockReset());
  api.listDepartures.mockImplementation(async () => []);
});

describe('admin dashboard', () => {
  it('shows metrics, simulated revenue and charts with a table view', async () => {
    const user = userEvent.setup();
    api.getStats.mockImplementation(async () => stats);
    renderAt('/admin');
    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(await screen.findByText(/revenue \(simulated\)/i)).toBeInTheDocument();
    expect(screen.getAllByText('₹99,996').length).toBeGreaterThan(0); // visually-hidden final value for SR
    expect(screen.getByRole('list', { name: /active bookings by destination/i })).toHaveTextContent('Kerala');

    await user.click(screen.getByRole('button', { name: /view as table/i }));
    const table = screen.getByRole('table', { name: /simulated revenue by month/i });
    expect(within(table).getAllByRole('row')).toHaveLength(7);
    expect(screen.getByRole('cell', { name: 'HH-AAAA1111' })).toBeInTheDocument();
  });

  it('is unavailable to customers', async () => {
    authMock.reset({ user: customerUser });
    renderAt('/admin/packages');
    expect(await screen.findByRole('heading', { name: /don’t have access/i })).toBeInTheDocument();
    expect(api.listPackagesAdmin).not.toHaveBeenCalled();
  });
});

describe('package management (scenario 7)', () => {
  it('validates, maps server errors, creates a package and opens its editor', async () => {
    const user = userEvent.setup();
    api.createPackage.mockImplementationOnce(async () => {
      throw new ApiError('A package with this slug already exists', 409, [{ field: 'slug', message: 'This slug is already used' }]);
    });
    api.createPackage.mockImplementationOnce(async (body) => ({ ...kerala, ...body, id: 'new-id', status: 'draft', updatedAt: new Date().toISOString() }));
    api.getPackageAdmin.mockImplementation(async () => ({ ...kerala, id: 'new-id', status: 'draft', updatedAt: new Date().toISOString() }));
    renderAt('/admin/packages/new');

    await user.click(await screen.findByRole('button', { name: /create package/i }));
    expect(screen.getByText('Title is required.')).toBeInTheDocument();
    expect(screen.getByLabelText('Title')).toHaveFocus();
    expect(api.createPackage).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Title'), 'Kerala Backwaters Escape — 5 Days');
    await user.type(screen.getByLabelText('URL slug (optional)'), 'kerala-backwaters-escape');
    await user.type(screen.getByLabelText('Destination'), 'Kerala');
    await user.type(screen.getByLabelText('Country'), 'India');
    await user.clear(screen.getByLabelText('Duration (days)'));
    await user.type(screen.getByLabelText('Duration (days)'), '5');
    await user.type(screen.getByLabelText(/base price/i), '21999');
    await user.type(screen.getByLabelText(/summary/i), 'Houseboats and tea hills in five days.');
    await user.type(screen.getByLabelText('Full description'), 'A relaxed loop through Kochi, Munnar and Alleppey.');
    await user.type(screen.getByLabelText('Image 1 URL'), 'https://images.unsplash.com/photo-1');
    await user.type(screen.getByLabelText('Image 1 alt text'), 'Houseboat on the backwaters');
    await user.type(screen.getByLabelText('Day 1 title'), 'Arrive in Kochi');
    await user.type(screen.getByLabelText('Day 1 description'), 'Check in and explore Fort Kochi.');
    await user.type(screen.getByLabelText(/^included \(one per line\)/i), '4 nights stay{enter}Breakfast');

    await user.click(screen.getByRole('button', { name: /create package/i }));
    expect(await screen.findByText('This slug is already used')).toBeInTheDocument();
    expect(screen.getByLabelText('URL slug (optional)')).toHaveFocus();

    await user.clear(screen.getByLabelText('URL slug (optional)'));
    await user.click(screen.getByRole('button', { name: /create package/i }));
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/admin/packages/new-id'));
    const body = api.createPackage.mock.calls[1][0];
    expect(body).toMatchObject({ title: 'Kerala Backwaters Escape — 5 Days', durationDays: 5, basePrice: 21999, status: 'draft', inclusions: ['4 nights stay', 'Breakfast'] });
    expect(body.itinerary).toEqual([{ day: 1, title: 'Arrive in Kochi', description: 'Check in and explore Fort Kochi.', activities: [] }]);
    expect(body).not.toHaveProperty('slug');
    expect(await screen.findByRole('heading', { name: /departures & capacity/i })).toBeInTheDocument();
  });

  it('adds a departure and shows capacity rule errors from the API', async () => {
    const user = userEvent.setup();
    const dep = { id: 'd1', startDate: addDays(todayIso(), 40), endDate: addDays(todayIso(), 44), capacity: 10, seatsRemaining: 4, bookedSeats: 6, activeBookings: 2, status: 'open' };
    api.getPackageAdmin.mockImplementation(async () => ({ ...kerala, status: 'published', updatedAt: '2026-10-01T00:00:00Z' }));
    api.listDepartures.mockImplementation(async () => [dep]);
    api.updateDeparture.mockImplementation(async () => {
      throw new ApiError('Validation failed', 400, [{ field: 'capacity', message: 'Capacity can’t be below the 6 seats already booked' }]);
    });
    api.createDeparture.mockImplementation(async (b) => ({ ...dep, id: 'd2', ...b }));
    renderAt(`/admin/packages/${kerala.id}`);

    await user.click(await screen.findByRole('button', { name: /edit departure/i }));
    const cap = screen.getByLabelText('Capacity', { selector: '#dep-d1-capacity' });
    await user.clear(cap);
    await user.type(cap, '3');
    await user.click(screen.getByRole('button', { name: /^save$/i }));
    expect(await screen.findByText(/below the 6 seats already booked/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /^add$/i }));
    await waitFor(() => expect(api.createDeparture).toHaveBeenCalledWith({ packageId: kerala.id, startDate: addDays(todayIso(), 30), capacity: 12 }));
    expect(await screen.findByText('Departure added')).toBeInTheDocument();
  });

  it('confirms before archiving/deleting a package', async () => {
    const user = userEvent.setup();
    api.listPackagesAdmin.mockImplementation(async () => ({ items: [{ ...kerala, departureCount: 4, activeBookings: 1 }], total: 1, page: 1, pages: 1 }));
    api.removePackage.mockImplementation(async () => ({ archived: true }));
    renderAt('/admin/packages');
    await user.click(await screen.findByRole('button', { name: /^remove .*archive or delete/i }));
    const dialog = await screen.findByRole('alertdialog', { name: /archive this package/i });
    await user.click(within(dialog).getByRole('button', { name: /yes, remove/i }));
    await waitFor(() => expect(api.removePackage).toHaveBeenCalledWith(kerala.id));
    expect(await screen.findByText('Package archived')).toBeInTheDocument();
  });
});

describe('booking management (demo step 7)', () => {
  const row = (over) => ({
    id: 'b1',
    reference: 'HH-AAAA1111',
    packageTitle: kerala.title,
    startDate: addDays(todayIso(), 30),
    endDate: addDays(todayIso(), 34),
    travellerCount: 2,
    totalAmount: 49998,
    currency: 'INR',
    bookingStatus: 'confirmed',
    paymentStatus: 'paid_demo',
    createdAt: new Date().toISOString(),
    customer: { name: 'Asha Rao', email: 'asha@example.com' },
    ...over,
  });

  it('filters via the URL and offers only valid transitions', async () => {
    const user = userEvent.setup();
    api.listBookingsAdmin.mockImplementation(async () => ({ items: [row(), row({ id: 'b2', reference: 'HH-PAST0002', startDate: addDays(todayIso(), -3) }), row({ id: 'b3', reference: 'HH-CANC0003', bookingStatus: 'cancelled' })], total: 3, page: 1, pages: 1 }));
    api.changeBookingStatus.mockImplementation(async (id, status) => ({ ...row(), bookingStatus: status, paymentStatus: 'refunded_demo' }));
    renderAt('/admin/bookings');

    expect(await screen.findByRole('button', { name: /cancel booking hh-aaaa1111/i })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /complete booking hh-aaaa1111/i })).not.toBeInTheDocument(); // future trip
    expect(screen.getByRole('button', { name: /complete booking hh-past0002/i })).toBeInTheDocument();
    expect(within(screen.getByRole('row', { name: /hh-canc0003/i })).getByText('No actions')).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText('Status'), 'confirmed');
    expect(screen.getByTestId('where')).toHaveTextContent('/admin/bookings?status=confirmed');
    await waitFor(() => expect(api.listBookingsAdmin).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'confirmed' })));

    await user.click(screen.getByRole('button', { name: /cancel booking hh-aaaa1111/i }));
    const dialog = await screen.findByRole('alertdialog');
    expect(dialog).toHaveTextContent(/demo refund of ₹49,998/);
    await user.click(within(dialog).getByRole('button', { name: /cancel booking/i }));
    await waitFor(() => expect(api.changeBookingStatus).toHaveBeenCalledWith('b1', 'cancelled'));
    expect(await screen.findByText(/hh-aaaa1111 cancelled/i)).toBeInTheDocument();
  });
});
