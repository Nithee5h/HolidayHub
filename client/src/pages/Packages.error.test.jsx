import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { renderWithRouter } from '../test/renderWithRouter';
import Packages from './Packages';

const listPackages = vi.fn();
vi.mock('../services/catalog', () => ({ listPackages: (...args) => listPackages(...args) }));

describe('Packages page network errors (scenario 14)', () => {
  it('shows an error with a retry that recovers', async () => {
    const user = userEvent.setup();
    listPackages.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ items: [], total: 0 });
    renderWithRouter(<Packages />, { route: '/packages' });

    expect(await screen.findByRole('heading', { name: /couldn’t load packages/i })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /try again/i }));
    expect(await screen.findByRole('heading', { name: /no packages match/i })).toBeInTheDocument();
    expect(listPackages).toHaveBeenCalledTimes(2);
  });
});
