import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import App from '../App';
import { ApiError } from '../services/ApiError';
import { adminUser, authMock, customerUser } from '../test/authMock';

vi.mock('../services/auth', async () => (await import('../test/authMock')).authMock.module);
vi.mock('../services/catalog', () => ({
  listPackages: async () => ({ items: [], total: 0, page: 1, pages: 1 }),
  getFacets: async () => ({ destinations: [], categories: [], themes: [] }),
}));
vi.mock('../services/admin', () => ({
  listCustomers: async () => ({ items: [{ ...customerUser, phone: undefined }], total: 1, page: 1, pages: 1 }),
}));

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
const where = () => screen.getByTestId('where');

beforeEach(() => {
  authMock.reset();
});

describe('Login', () => {
  it('validates fields before calling the API', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    await user.click(await screen.findByRole('button', { name: /^log in$/i }));
    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(authMock.module.login).not.toHaveBeenCalled();
  });

  it('shows the server’s non-revealing error on bad credentials', async () => {
    const user = userEvent.setup();
    authMock.module.login.mockImplementation(async () => {
      throw new ApiError('Invalid email or password', 401);
    });
    renderAt('/login');
    await user.type(await screen.findByLabelText('Email'), 'asha@example.com');
    await user.type(screen.getByLabelText('Password'), 'wrong123');
    await user.click(screen.getByRole('button', { name: /^log in$/i }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password');
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderAt('/login');
    const pw = await screen.findByLabelText('Password');
    expect(pw).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: /show password/i }));
    expect(pw).toHaveAttribute('type', 'text');
    expect(screen.getByRole('button', { name: /hide password/i })).toHaveAttribute('aria-pressed', 'true');
  });

  it('returns to the protected page after logging in', async () => {
    const user = userEvent.setup();
    authMock.module.login.mockImplementation(async () => customerUser);
    renderAt('/profile');
    await waitFor(() => expect(where()).toHaveTextContent('/login?next=%2Fprofile'));

    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.type(screen.getByLabelText('Password'), 'travel2026');
    await user.click(screen.getByRole('button', { name: /^log in$/i }));
    await waitFor(() => expect(where()).toHaveTextContent(/^\/profile$/));
    expect(await screen.findByRole('heading', { name: 'Asha Rao' })).toBeInTheDocument();
  });

  it('ignores external redirect targets', async () => {
    authMock.reset({ user: customerUser });
    renderAt('/login?next=https%3A%2F%2Fevil.example');
    await waitFor(() => expect(where()).toHaveTextContent(/^\/$/));
  });
});

describe('Register (scenario 4)', () => {
  it('shows live password requirements and blocks weak/mismatched passwords', async () => {
    const user = userEvent.setup();
    renderAt('/register');
    const pw = await screen.findByLabelText('Password');
    await user.type(pw, 'abc');
    const rules = within(screen.getByRole('list', { name: /password requirements/i }));
    expect(rules.getByText(/contains a letter/i).closest('li')).toHaveClass('is-met');
    expect(rules.getByText(/contains a number/i).closest('li')).not.toHaveClass('is-met');

    await user.type(screen.getByLabelText('Full name'), 'Asha');
    await user.type(screen.getByLabelText('Email'), 'bad-email');
    await user.type(screen.getByLabelText('Confirm password'), 'abd');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByText(/doesn’t meet the requirements/)).toBeInTheDocument();
    expect(screen.getByText('Passwords don’t match.')).toBeInTheDocument();
    expect(authMock.module.register).not.toHaveBeenCalled();
  });

  it('maps a duplicate-email response to the email field and never sends a role', async () => {
    const user = userEvent.setup();
    authMock.module.register.mockImplementation(async () => {
      throw new ApiError('An account with this email already exists', 409, [{ field: 'email', message: 'This email is already registered' }]);
    });
    renderAt('/register');
    await user.type(await screen.findByLabelText('Full name'), 'Asha Rao');
    await user.type(screen.getByLabelText('Email'), 'asha@example.com');
    await user.type(screen.getByLabelText('Password'), 'travel2026');
    await user.type(screen.getByLabelText('Confirm password'), 'travel2026');
    await user.click(screen.getByRole('button', { name: /create account/i }));

    expect(await screen.findByText('This email is already registered')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toHaveFocus();
    expect(authMock.module.register.mock.calls[0][0]).toEqual({ name: 'Asha Rao', email: 'asha@example.com', phone: '', password: 'travel2026' });
  });
});

describe('route guards and account menu', () => {
  it('customers cannot open the admin page', async () => {
    authMock.reset({ user: customerUser });
    renderAt('/admin');
    expect(await screen.findByRole('heading', { name: /don’t have access/i })).toBeInTheDocument();
  });

  it('admins can open the customers list', async () => {
    authMock.reset({ user: adminUser });
    renderAt('/admin/customers');
    expect(await screen.findByRole('cell', { name: 'asha@example.com' })).toBeInTheDocument();
  });

  it('account menu supports keyboard and logs out', async () => {
    const user = userEvent.setup();
    authMock.reset({ user: adminUser });
    renderAt('/packages');
    const button = await screen.findByRole('button', { name: /account menu for/i });
    button.focus();
    await user.keyboard('{ArrowDown}');
    const menu = await screen.findByRole('menu', { name: /account/i });
    await waitFor(() => expect(within(menu).getByRole('menuitem', { name: /dashboard/i })).toHaveFocus());
    await user.keyboard('{ArrowUp}');
    expect(within(menu).getByRole('menuitem', { name: /log out/i })).toHaveFocus();
    await user.keyboard('{Escape}');
    await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
    expect(button).toHaveFocus();

    await user.click(button);
    await user.click(await screen.findByRole('menuitem', { name: /log out/i }));
    await waitFor(() => expect(where()).toHaveTextContent(/^\/$/));
    expect(authMock.module.logout).toHaveBeenCalled();
    expect(screen.getAllByRole('link', { name: /log in/i }).length).toBeGreaterThan(0);
  });
});

describe('Profile', () => {
  it('shows email as a read-only identifier and saves name/phone', async () => {
    const user = userEvent.setup();
    authMock.reset({ user: customerUser });
    authMock.module.updateProfile.mockImplementation(async (changes) => ({ ...customerUser, ...changes, phone: changes.phone || undefined }));
    renderAt('/profile');

    const email = await screen.findByLabelText(/email \(account identifier\)/i);
    expect(email).toHaveValue('asha@example.com');
    expect(email).toBeDisabled();
    const save = screen.getByRole('button', { name: /save changes/i });
    expect(save).toBeDisabled();

    const name = screen.getByLabelText('Full name');
    await user.clear(name);
    await user.type(name, 'Asha R.');
    await user.clear(screen.getByLabelText('Phone (optional)'));
    await user.click(save);

    expect(authMock.module.updateProfile).toHaveBeenCalledWith({ name: 'Asha R.', phone: '' });
    expect(await screen.findByText('Profile updated')).toBeInTheDocument();
  });
});

describe('logging out from a protected page', () => {
  it('lands on the homepage, not the login page', async () => {
    const user = userEvent.setup();
    authMock.reset({ user: customerUser });
    renderAt('/profile');
    await user.click(await screen.findByRole('button', { name: /^log out$/i }));
    await waitFor(() => expect(where()).toHaveTextContent(/^\/$/));
    expect(screen.queryByRole('heading', { name: /welcome back/i })).not.toBeInTheDocument();
  });
});
