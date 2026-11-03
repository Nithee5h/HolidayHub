import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuthProvider from '../../context/AuthProvider';
import { authMock } from '../../test/authMock';
import { renderWithRouter } from '../../test/renderWithRouter';
import Navbar from './Navbar';

vi.mock('../../services/auth', async () => (await import('../../test/authMock')).authMock.module);

beforeEach(() => {
  authMock.reset();
});

const renderNavbar = () =>
  renderWithRouter(
    <AuthProvider>
      <Navbar />
    </AuthProvider>,
  );

describe('Navbar mobile menu (spec test scenario 3)', () => {
  it('opens, traps focus, closes on Escape and restores focus', async () => {
    const user = userEvent.setup();
    renderNavbar();
    const toggle = screen.getByRole('button', { name: /open menu/i });

    await user.click(toggle);
    const dialog = await screen.findByRole('dialog', { name: /site navigation/i });
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(dialog).toContainElement(document.activeElement);

    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(toggle).toHaveFocus();
  });

  it('navigates and closes when a link is chosen', async () => {
    const user = userEvent.setup();
    renderNavbar();
    await user.click(screen.getByRole('button', { name: /open menu/i }));
    const dialog = await screen.findByRole('dialog');

    const link = [...dialog.querySelectorAll('a')].find((a) => a.textContent.includes('Holiday Packages'));
    await user.click(link);

    expect(screen.getByTestId('location')).toHaveTextContent('/packages');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
