import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { bali, kerala, listResponse, paris, withSummary } from '../test/fixtures';
import { renderWithRouter } from '../test/renderWithRouter';
import Packages from './Packages';

const listPackages = vi.fn();
vi.mock('../services/catalog', () => ({ listPackages: (...args) => listPackages(...args) }));

const ALL = [withSummary(kerala), withSummary(bali), withSummary(paris, null, 0)];

beforeEach(() => {
  listPackages.mockReset();
  // Simple stand-in for the API: filter fixtures by destination.
  listPackages.mockImplementation(async (filters) =>
    listResponse(ALL.filter((p) => !filters.destination || p.destination.toLowerCase().includes(filters.destination.toLowerCase()))),
  );
});

const cardTitles = async () => {
  await screen.findByText(/packages? found/i);
  return screen.queryAllByRole('heading', { level: 3 }).map((h) => h.textContent);
};
const sidebar = () => within(screen.getByRole('complementary', { name: /filters/i }));
const lastFilters = () => listPackages.mock.calls.at(-1)[0];

describe('Packages page', () => {
  it('passes URL filters to the API and renders results with departure info', async () => {
    renderWithRouter(<Packages />, { route: '/packages?destination=Kerala&travellers=2&sort=price-asc' });
    expect(await cardTitles()).toEqual(['Kerala Backwaters Escape']);
    expect(lastFilters()).toMatchObject({ destination: 'Kerala', travellers: 2, sort: 'price-asc' });
    expect(screen.getByText(/only 2 left/i)).toBeInTheDocument();
    // Party size is carried into the details link.
    expect(screen.getByRole('link', { name: 'Kerala Backwaters Escape' })).toHaveAttribute('href', '/packages/kerala-backwaters-escape?travellers=2');
  });

  it('shows "no upcoming departures" for packages without dates', async () => {
    renderWithRouter(<Packages />, { route: '/packages?destination=Paris' });
    await cardTitles();
    expect(screen.getByText(/no upcoming departures/i)).toBeInTheDocument();
  });

  it('clears all filters and removes single chips', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Packages />, { route: '/packages?destination=Kerala&category=Family' });
    await cardTitles();

    await user.click(screen.getByRole('button', { name: /remove filter family/i }));
    expect(screen.getByTestId('location')).toHaveTextContent('/packages?destination=Kerala');

    await user.click(screen.getByRole('button', { name: /^clear all$/i }));
    expect(screen.getByTestId('location')).toHaveTextContent(/^\/packages$/);
    expect(await screen.findAllByRole('heading', { level: 3 })).toHaveLength(3);
  });

  it('sidebar radios write category, budget and duration to the URL', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Packages />, { route: '/packages' });
    await cardTitles();

    await user.click(sidebar().getByRole('radio', { name: 'Honeymoon' }));
    await user.click(sidebar().getByRole('radio', { name: /₹50,000 – ₹1,00,000/ }));
    await user.click(sidebar().getByRole('radio', { name: /6\+ days/ }));
    expect(screen.getByTestId('location')).toHaveTextContent('/packages?category=Honeymoon&minPrice=50000&maxPrice=100000&duration=6-');
    await waitFor(() => expect(lastFilters()).toMatchObject({ category: 'Honeymoon', minPrice: 50000, maxPrice: 100000, duration: '6-' }));
  });

  it('debounces the destination search into the URL', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Packages />, { route: '/packages' });
    await cardTitles();

    await user.type(sidebar().getByRole('combobox', { name: /destination/i }), 'bali');
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/packages?destination=bali'), { timeout: 1000 });
    // One request per committed search, not per keystroke.
    expect(listPackages.mock.calls.filter(([f]) => f.destination).map(([f]) => f.destination)).toEqual(['bali']);
  });

  it('sort select updates the URL', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Packages />, { route: '/packages' });
    await cardTitles();
    await user.selectOptions(screen.getByLabelText(/sort packages/i), 'duration-desc');
    expect(screen.getByTestId('location')).toHaveTextContent('/packages?sort=duration-desc');
  });

  it('mobile filter sheet opens as a dialog, closes and restores focus', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Packages />, { route: '/packages?category=Luxury' });
    await cardTitles();

    await user.click(screen.getByRole('button', { name: /filters \(1\)/i }));
    const dialog = await screen.findByRole('dialog', { name: /filters/i });
    expect(within(dialog).getByRole('radio', { name: 'Luxury' })).toBeChecked();
    await user.click(within(dialog).getByRole('button', { name: /show 3 results/i }));
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: /filters \(1\)/i })).toHaveFocus();
  });

  it('shows a helpful empty state with a working reset', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Packages />, { route: '/packages?destination=Atlantis' });
    expect(await screen.findByRole('heading', { name: /no packages match/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /clear all filters/i }));
    expect(await screen.findAllByRole('heading', { level: 3 })).toHaveLength(3);
  });
});
