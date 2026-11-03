import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { ApiError } from '../services/ApiError';
import { addDays, todayIso } from '../utils/dates';
import { authMock, customerUser } from '../test/authMock';
import { kerala } from '../test/fixtures';

vi.mock('../services/auth', async () => (await import('../test/authMock')).authMock.module);
vi.mock('../services/catalog', async () => {
  const f = await import('../test/fixtures');
  return {
    getDeparture: vi.fn(async (id) => ({ departure: f.keralaDepartures.find((d) => d.id === id), package: f.kerala })),
    listPackages: async () => ({ items: [], total: 0 }),
    getFacets: async () => ({ destinations: [], categories: [], themes: [] }),
  };
});
const api = vi.hoisted(() => ({
  quoteBooking: vi.fn(),
  createBooking: vi.fn(),
  payDemo: vi.fn(),
  cancelBooking: vi.fn(),
  listMyBookings: vi.fn(),
  getBooking: vi.fn(),
}));
vi.mock('../services/bookings', () => api);

const today = todayIso();
const booking = (over = {}) => ({
  id: 'b1',
  reference: 'HH-1A2B3C4D',
  packageTitle: kerala.title,
  packageSlug: kerala.slug,
  destination: 'Kerala',
  coverImage: kerala.images[0],
  startDate: addDays(today, 44),
  endDate: addDays(today, 48),
  travellers: [{ name: 'Asha Rao' }, { name: 'Ravi Rao', age: 34 }],
  travellerCount: 2,
  unitPriceSnapshot: 24999,
  totalAmount: 49998,
  currency: 'INR',
  bookingStatus: 'pending',
  paymentStatus: 'unpaid',
  holdExpiresAt: new Date(Date.now() + 14 * 60 * 1000).toISOString(),
  tab: 'upcoming',
  cancellation: { canCancel: true, deadline: addDays(today, 37), cutoffDays: 7 },
  payments: [],
  ...over,
});

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

beforeEach(() => {
  authMock.reset({ user: customerUser });
  Object.values(api).forEach((fn) => fn.mockReset());
});

describe('Checkout flow', () => {
  it('requires login before checkout', async () => {
    authMock.reset();
    renderAt('/booking/dep-3?travellers=2');
    await waitFor(() => expect(screen.getByTestId('where')).toHaveTextContent('/login?next=%2Fbooking%2Fdep-3%3Ftravellers%3D2'));
  });

  it('walks departure → travellers → review → demo payment → confirmation', async () => {
    const user = userEvent.setup();
    api.quoteBooking.mockImplementation(async (id, n) => ({ unitPrice: 24999, totalAmount: 24999 * n, currency: 'INR', available: true, seatsRemaining: 14, holdMinutes: 15 }));
    api.createBooking.mockImplementation(async () => booking());
    api.payDemo.mockImplementation(async () => ({ booking: booking({ bookingStatus: 'confirmed', paymentStatus: 'paid_demo', holdExpiresAt: undefined }), payment: { id: 'p1' } }));
    renderAt('/booking/dep-3?travellers=2');

    // 1. Departure
    expect(await screen.findByRole('heading', { name: /confirm your departure/i })).toBeInTheDocument();
    expect(screen.getByRole('spinbutton', { name: /travellers/i })).toHaveValue(2);
    expect(screen.getByRole('navigation', { name: /checkout progress/i })).toHaveTextContent('Departure');
    await user.click(screen.getByRole('button', { name: /^continue$/i }));

    // 2. Travellers — first prefilled from the account, second required
    expect(await screen.findByRole('heading', { name: /who’s travelling/i })).toBeInTheDocument();
    const t1 = screen.getByRole('group', { name: 'Traveller 1' });
    expect(within(t1).getByLabelText('Full name')).toHaveValue('Asha Rao');
    await user.click(screen.getByRole('button', { name: /review booking/i }));
    const t2 = screen.getByRole('group', { name: 'Traveller 2' });
    expect(within(t2).getByText('Enter the traveller’s full name.')).toBeInTheDocument();
    expect(within(t2).getByLabelText('Full name')).toHaveFocus();
    await user.type(within(t2).getByLabelText('Full name'), 'Ravi Rao');
    await user.type(within(t2).getByLabelText('Age (optional)'), '34');
    await user.click(screen.getByRole('button', { name: /review booking/i }));

    // 3. Review shows the server quote
    expect(await screen.findByRole('heading', { name: /review your booking/i })).toBeInTheDocument();
    expect(api.quoteBooking).toHaveBeenCalledWith('dep-3', 2);
    expect(screen.getByText('₹49,998')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /reserve seats/i }));
    const payload = api.createBooking.mock.calls[0][0];
    expect(payload).toMatchObject({ departureId: 'dep-3', travellers: [{ name: 'Asha Rao' }, { name: 'Ravi Rao', age: 34 }] });
    expect(payload.idempotencyKey).toMatch(/.{8,}/);
    expect(payload).not.toHaveProperty('totalAmount');

    // 4. Demo payment — clearly simulated, no card fields
    expect(await screen.findByRole('heading', { name: /^payment$/i })).toBeInTheDocument();
    expect(screen.getByText(/demo payment — simulated/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/card|cvv/i)).not.toBeInTheDocument();
    expect(screen.getByText(/seats held for/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /pay ₹49,998 \(demo\)/i }));

    // 5. Confirmation
    expect(await screen.findByRole('heading', { name: /you’re going to kerala/i })).toBeInTheDocument();
    expect(screen.getAllByText('HH-1A2B3C4D').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: /view my bookings/i })).toHaveAttribute('href', '/my-bookings');
  });

  it('keeps entered data when going back a step', async () => {
    const user = userEvent.setup();
    renderAt('/booking/dep-3?travellers=2');
    await user.click(await screen.findByRole('button', { name: /^continue$/i }));
    const t2 = await screen.findByRole('group', { name: 'Traveller 2' });
    await user.type(within(t2).getByLabelText('Full name'), 'Ravi Rao');
    await user.click(screen.getByRole('button', { name: /^back$/i }));
    await user.click(await screen.findByRole('button', { name: /^continue$/i }));
    expect(within(await screen.findByRole('group', { name: 'Traveller 2' })).getByLabelText('Full name')).toHaveValue('Ravi Rao');
  });

  it('shows a declined demo payment and lets the user retry', async () => {
    const user = userEvent.setup();
    api.quoteBooking.mockImplementation(async () => ({ unitPrice: 24999, totalAmount: 24999, currency: 'INR', available: true, seatsRemaining: 14, holdMinutes: 15 }));
    api.createBooking.mockImplementation(async () => booking({ travellers: [{ name: 'Asha Rao' }], travellerCount: 1, totalAmount: 24999 }));
    api.payDemo.mockImplementation(async (_id, outcome) => {
      if (outcome === 'decline') throw new ApiError('Demo payment declined (simulated). No money was taken — you can try again.', 402);
      return { booking: booking({ bookingStatus: 'confirmed', paymentStatus: 'paid_demo' }), payment: {} };
    });
    renderAt('/booking/dep-3?travellers=1');
    await user.click(await screen.findByRole('button', { name: /^continue$/i }));
    await user.click(await screen.findByRole('button', { name: /review booking/i }));
    await user.click(await screen.findByRole('button', { name: /reserve seats/i }));
    await user.click(await screen.findByRole('button', { name: /simulate a declined payment/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent(/declined \(simulated\)/i);
    await user.click(screen.getByRole('button', { name: /pay .* \(demo\)/i }));
    expect(await screen.findByRole('heading', { name: /you’re going to/i })).toBeInTheDocument();
  });

  it('surfaces a seat conflict from the server', async () => {
    const user = userEvent.setup();
    api.quoteBooking.mockImplementation(async () => ({ unitPrice: 24999, totalAmount: 24999, currency: 'INR', available: true, seatsRemaining: 1, holdMinutes: 15 }));
    api.createBooking.mockImplementation(async () => {
      throw new ApiError('Sorry, this departure just sold out', 409);
    });
    renderAt('/booking/dep-3?travellers=1');
    await user.click(await screen.findByRole('button', { name: /^continue$/i }));
    await user.click(await screen.findByRole('button', { name: /review booking/i }));
    await user.click(await screen.findByRole('button', { name: /reserve seats/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('just sold out');
  });

  it('refuses sold-out departures up front', async () => {
    renderAt('/booking/dep-1');
    expect(await screen.findByRole('heading', { name: /can’t be booked/i })).toBeInTheDocument();
  });
});

describe('My Bookings', () => {
  it('groups bookings into keyboard-navigable tabs with empty states', async () => {
    const user = userEvent.setup();
    api.listMyBookings.mockImplementation(async () => [
      booking({ id: 'b1', bookingStatus: 'confirmed', paymentStatus: 'paid_demo' }),
      booking({ id: 'b2', reference: 'HH-CANCEL01', bookingStatus: 'cancelled', tab: 'cancelled' }),
    ]);
    renderAt('/my-bookings');
    const upcoming = await screen.findByRole('tab', { name: /upcoming\s*, 1 booking$/i });
    expect(upcoming).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('link', { name: kerala.title })).toHaveAttribute('href', '/my-bookings/b1');

    upcoming.focus();
    await user.keyboard('{ArrowRight}');
    const completed = screen.getByRole('tab', { name: /completed\s*, 0 bookings$/i });
    expect(completed).toHaveFocus();
    expect(completed).toHaveAttribute('aria-selected', 'true');
    expect(await screen.findByRole('heading', { name: /no completed trips/i })).toBeInTheDocument();
    expect(screen.getByTestId('where')).toHaveTextContent('/my-bookings?tab=completed');

    await user.keyboard('{End}');
    expect(await screen.findByText('HH-CANCEL01')).toBeInTheDocument();
  });

  it('shows an error with retry', async () => {
    const user = userEvent.setup();
    api.listMyBookings.mockImplementationOnce(async () => {
      throw new ApiError('Unable to reach the server.', 0);
    });
    api.listMyBookings.mockImplementationOnce(async () => []);
    renderAt('/my-bookings');
    await user.click(await screen.findByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { name: /no upcoming trips yet/i })).toBeInTheDocument();
  });
});

describe('Booking details', () => {
  it('cancels after confirmation and records the demo refund', async () => {
    const user = userEvent.setup();
    const paid = booking({ bookingStatus: 'confirmed', paymentStatus: 'paid_demo', holdExpiresAt: undefined, payments: [{ id: 'p1', status: 'success_demo', amount: 49998, currency: 'INR', transactionReference: 'DEMO-AAA', createdAt: new Date().toISOString() }] });
    api.getBooking.mockImplementation(async () => paid);
    api.cancelBooking.mockImplementation(async () => ({
      ...paid,
      bookingStatus: 'cancelled',
      paymentStatus: 'refunded_demo',
      tab: 'cancelled',
      cancellationReason: 'customer',
      cancelledAt: new Date().toISOString(),
      cancellation: { ...paid.cancellation, canCancel: false },
      payments: [...paid.payments, { id: 'p2', status: 'refunded_demo', amount: 49998, currency: 'INR', transactionReference: 'DEMO-REFUND-B', createdAt: new Date().toISOString() }],
    }));
    renderAt('/my-bookings/b1');

    await user.click(await screen.findByRole('button', { name: /cancel booking/i }));
    const dialog = await screen.findByRole('alertdialog', { name: /cancel this booking/i });
    expect(within(dialog).getByRole('button', { name: /keep it/i })).toHaveFocus();
    expect(dialog).toHaveTextContent(/demo refund of ₹49,998/);
    await user.click(within(dialog).getByRole('button', { name: /yes, cancel booking/i }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(api.cancelBooking).toHaveBeenCalledWith('b1');
    expect(screen.getByText('Refund (demo)')).toBeInTheDocument();
    expect(screen.getByText(/cancelled by you/i)).toBeInTheDocument();
    expect(await screen.findByText('Booking cancelled')).toBeInTheDocument(); // toast
    expect(screen.queryByRole('button', { name: /cancel booking/i })).not.toBeInTheDocument();
  });

  it('Escape closes the confirmation without cancelling', async () => {
    const user = userEvent.setup();
    api.getBooking.mockImplementation(async () => booking({ bookingStatus: 'confirmed', paymentStatus: 'paid_demo' }));
    renderAt('/my-bookings/b1');
    await user.click(await screen.findByRole('button', { name: /cancel booking/i }));
    await screen.findByRole('alertdialog');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(api.cancelBooking).not.toHaveBeenCalled();
  });

  it('lets the owner finish paying a pending booking', async () => {
    const user = userEvent.setup();
    api.getBooking.mockImplementation(async () => booking());
    api.payDemo.mockImplementation(async () => ({ booking: booking({ bookingStatus: 'confirmed', paymentStatus: 'paid_demo', holdExpiresAt: undefined }), payment: {} }));
    renderAt('/my-bookings/b1');
    await user.click(await screen.findByRole('button', { name: /pay ₹49,998 \(demo\)/i }));
    expect(await screen.findByText('Paid (demo)')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /complete your payment/i })).not.toBeInTheDocument();
  });

  it('hides other users’ bookings behind a not-found page', async () => {
    api.getBooking.mockImplementation(async () => {
      throw new ApiError('Booking not found', 404);
    });
    renderAt('/my-bookings/someone-elses');
    expect(await screen.findByRole('heading', { name: /booking not found/i })).toBeInTheDocument();
  });
});
