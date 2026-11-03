import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ApiError } from '../services/ApiError';
import { bali, kerala, keralaDepartures, paris, withSummary } from '../test/fixtures';
import { renderWithRouter } from '../test/renderWithRouter';
import PackageDetails from './PackageDetails';

const bySlug = { [kerala.slug]: kerala, [bali.slug]: bali, [paris.slug]: paris };
vi.mock('../services/catalog', () => ({
  getPackage: async (slug) => {
    if (!bySlug[slug]) throw new ApiError('Package not found', 404);
    return bySlug[slug];
  },
  getDepartures: async (slug) => (slug === kerala.slug ? keralaDepartures : []),
  getRelatedPackages: async () => [withSummary(bali)],
}));

const renderPackage = (slug, search = '') =>
  renderWithRouter(<PackageDetails />, { route: `/packages/${slug}${search}`, path: '/packages/:id' });

// Two summaries render (mobile + desktop); the desktop one lives in the aside.
const desktopSummary = () => within(screen.getByRole('complementary', { name: /booking summary/i }));

describe('Package details', () => {
  it('renders the package from a direct link with related suggestions', async () => {
    renderPackage(kerala.slug);
    expect(await screen.findByRole('heading', { level: 1, name: 'Kerala Backwaters Escape' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toHaveTextContent('Kerala');
    expect(screen.getByRole('heading', { name: /you may also like/i })).toBeInTheDocument();
  });

  it('itinerary days expand and collapse accessibly', async () => {
    const user = userEvent.setup();
    renderPackage(kerala.slug);
    const day1 = await screen.findByRole('button', { name: /^day 1\s*:\s*arrive in kochi$/i });
    const day2 = screen.getByRole('button', { name: /^day 2\s*:\s*drive to munnar$/i });
    expect(day1).toHaveAttribute('aria-expanded', 'true');
    expect(day2).toHaveAttribute('aria-expanded', 'false');

    await user.click(day2);
    expect(day2).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: /day 2/i })).toHaveTextContent(/tea country/);

    await user.click(screen.getByRole('button', { name: /expand all/i }));
    expect(screen.getAllByRole('button', { name: /^day \d/i }).every((b) => b.getAttribute('aria-expanded') === 'true')).toBe(true);
  });

  it('sold-out departures are disabled and the first bookable one is preselected', async () => {
    renderPackage(kerala.slug);
    const group = await screen.findByRole('group', { name: /choose a departure date/i });
    const radios = within(group).getAllByRole('radio');
    expect(radios[0]).toBeDisabled();
    expect(radios[1]).toBeChecked();
    expect(within(group).getByText('Peak')).toBeInTheDocument();
  });

  it('total = travellers × unit price; Book Now links to checkout (scenario 8)', async () => {
    const user = userEvent.setup();
    renderPackage(kerala.slug, '?travellers=2');
    await screen.findByRole('heading', { level: 1 });

    const summary = desktopSummary();
    expect(summary.getByRole('spinbutton', { name: /travellers/i })).toHaveValue(2);
    expect(summary.getByText('₹49,998')).toBeInTheDocument();
    expect(summary.getByRole('link', { name: /book now/i })).toHaveAttribute('href', '/booking/dep-2?travellers=2');

    // Only 2 seats on dep-2: the stepper can't exceed them.
    expect(summary.getByRole('button', { name: /increase travellers/i })).toBeDisabled();
    await user.click(summary.getByRole('button', { name: /decrease travellers/i }));
    expect(summary.getByText('₹24,999', { selector: 'strong' })).toBeInTheDocument();
  });

  it('a peak departure uses its own price', async () => {
    const user = userEvent.setup();
    renderPackage(kerala.slug);
    const group = await screen.findByRole('group', { name: /choose a departure date/i });
    await user.click(within(group).getAllByRole('radio')[3]);
    expect(desktopSummary().getByText('₹27,999', { selector: 'strong' })).toBeInTheDocument();
  });

  it('packages without upcoming departures cannot be booked', async () => {
    renderPackage(paris.slug);
    expect(await screen.findByText(/no upcoming departures for this package/i)).toBeInTheDocument();
    expect(desktopSummary().getByRole('button', { name: /select a departure/i })).toBeDisabled();
  });

  it('gallery moves between photos', async () => {
    const user = userEvent.setup();
    renderPackage(kerala.slug);
    const gallery = within(await screen.findByRole('region', { name: /kerala backwaters escape photos/i }));
    expect(gallery.getByText('1 / 3')).toBeInTheDocument();
    await user.click(gallery.getByRole('button', { name: /next photo/i }));
    expect(gallery.getByText('2 / 3')).toBeInTheDocument();
    await user.click(gallery.getByRole('button', { name: /show photo 3/i }));
    expect(gallery.getByText('3 / 3')).toBeInTheDocument();
  });

  it('shows not found for unknown packages', async () => {
    renderPackage('does-not-exist');
    expect(await screen.findByRole('heading', { name: /package not found/i })).toBeInTheDocument();
  });
});
