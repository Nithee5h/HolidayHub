import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from './services/ApiError';
import { bali, facets, kerala, keralaDepartures, listResponse, withSummary } from './test/fixtures';
import App from './App';
import { authMock } from './test/authMock';

vi.mock('./services/auth', async () => (await import('./test/authMock')).authMock.module);
vi.mock('./services/catalog', () => ({
  listPackages: async () => listResponse([withSummary(kerala), withSummary(bali)]),
  getFacets: async () => facets,
  getPackage: async (slug) => {
    if (slug !== kerala.slug) throw new ApiError('Package not found', 404);
    return kerala;
  },
  getDepartures: async () => keralaDepartures,
  getRelatedPackages: async () => [],
}));

beforeEach(() => {
  authMock.reset();
});

const renderAt = (route) =>
  render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>,
  );

describe('App routing', () => {
  it('renders the homepage hero copy and CTAs', () => {
    renderAt('/');
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Your Next Adventure Begins Here.');
    expect(screen.getByText('Explore extraordinary destinations. Create unforgettable memories.')).toBeInTheDocument();
    const hero = within(screen.getByRole('region', { name: /your next adventure/i }));
    expect(hero.getByRole('link', { name: /explore destinations/i })).toHaveAttribute('href', '/destinations');
    expect(hero.getByRole('button', { name: /plan your trip/i })).toBeInTheDocument();
    expect(hero.getByRole('search', { name: /search holiday packages/i })).toBeInTheDocument();
  });

  it('homepage loads featured packages and destination counts from the API', async () => {
    renderAt('/');
    const card = await screen.findByRole('link', { name: 'Kerala Backwaters Escape' });
    expect(card).toHaveAttribute('href', '/packages/kerala-backwaters-escape');
    expect(await screen.findByText(/2 packages · from ₹8,999/)).toBeInTheDocument(); // Goa facet
    expect(await screen.findByText('3 packages')).toBeInTheDocument(); // romantic theme
  });

  it('renders package details from a direct link', async () => {
    renderAt('/packages/kerala-backwaters-escape');
    expect(await screen.findByRole('heading', { level: 1, name: 'Kerala Backwaters Escape' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /day-by-day itinerary/i })).toBeInTheDocument();
  });

  it('shows not-found states for unknown packages and routes', async () => {
    renderAt('/packages/does-not-exist');
    expect(await screen.findByRole('heading', { name: /package not found/i })).toBeInTheDocument();
  });

  it('shows 404 for unknown routes', () => {
    renderAt('/nowhere');
    expect(screen.getByRole('heading', { name: /took a detour/i })).toBeInTheDocument();
  });
});
