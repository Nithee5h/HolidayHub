import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderWithRouter } from '../../test/renderWithRouter';
import SearchBar from './SearchBar';

describe('SearchBar', () => {
  it('navigates to /packages with shareable query params', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SearchBar />);

    await user.type(screen.getByLabelText(/destination/i), 'Kerala');
    await user.click(screen.getByRole('button', { name: /increase travellers/i }));
    await user.selectOptions(screen.getByLabelText(/budget/i), '15000-50000');
    await user.click(screen.getByRole('button', { name: /^search$/i }));

    expect(screen.getByTestId('location')).toHaveTextContent('/packages?destination=Kerala&travellers=3&minPrice=15000&maxPrice=50000');
  });

  it('clamps travellers between 1 and 12', async () => {
    const user = userEvent.setup();
    renderWithRouter(<SearchBar />);
    const input = screen.getByRole('spinbutton', { name: /travellers/i });

    await user.clear(input);
    await user.type(input, '99');
    await user.tab();
    expect(input).toHaveValue(12);
    expect(screen.getByRole('button', { name: /increase travellers/i })).toBeDisabled();
  });

  it('prefills from initial filters', () => {
    renderWithRouter(<SearchBar initial={{ destination: 'Goa', travellers: 4, minPrice: 0, maxPrice: 15000 }} />);
    expect(screen.getByLabelText(/destination/i)).toHaveValue('Goa');
    expect(screen.getByRole('spinbutton', { name: /travellers/i })).toHaveValue(4);
    expect(screen.getByLabelText(/budget/i)).toHaveValue('0-15000');
  });
});
