import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '../services/ApiError';
import { renderWithRouter } from '../test/renderWithRouter';
import Contact from './Contact';

const sendContactMessage = vi.fn();
vi.mock('../services/contact', () => ({ sendContactMessage: (...args) => sendContactMessage(...args) }));

// Block body: a function returned from beforeEach would run as a teardown hook.
beforeEach(() => {
  sendContactMessage.mockReset();
});

async function fillValid(user) {
  await user.type(screen.getByLabelText('Your name'), 'Asha');
  await user.type(screen.getByLabelText('Email'), 'asha@example.com');
  await user.type(screen.getByLabelText('Message'), 'Do you offer group discounts?');
}

describe('Contact form', () => {
  it('validates before sending and focuses the first invalid field', async () => {
    const user = userEvent.setup();
    renderWithRouter(<Contact />);
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(sendContactMessage).not.toHaveBeenCalled();
    expect(screen.getByText('Please enter your name.')).toBeInTheDocument();
    expect(screen.getByText('Please enter a valid email address.')).toBeInTheDocument();
    expect(screen.getByLabelText('Your name')).toHaveFocus();
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('sends a valid message and shows a confirmation only after the server accepts it', async () => {
    const user = userEvent.setup();
    let resolve;
    sendContactMessage.mockReturnValue(new Promise((r) => (resolve = r)));
    renderWithRouter(<Contact />);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(screen.getByRole('button', { name: /sending/i })).toBeDisabled();
    expect(sendContactMessage).toHaveBeenCalledWith({ name: 'Asha', email: 'asha@example.com', subject: undefined, message: 'Do you offer group discounts?' });
    resolve({ id: 'm1' });
    expect(await screen.findByRole('heading', { name: /message received/i })).toBeInTheDocument();
  });

  it('maps server validation errors onto fields', async () => {
    const user = userEvent.setup();
    sendContactMessage.mockImplementation(async () => {
      throw new ApiError('Validation failed', 400, [{ field: 'email', message: 'Email domain not accepted' }]);
    });
    renderWithRouter(<Contact />);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByText('Email domain not accepted')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toHaveTextContent(/fix the highlighted fields/i);
  });

  it('shows network errors without losing what was typed', async () => {
    const user = userEvent.setup();
    sendContactMessage.mockImplementation(async () => {
      throw new ApiError('Unable to reach the server.', 0);
    });
    renderWithRouter(<Contact />);
    await fillValid(user);
    await user.click(screen.getByRole('button', { name: /send message/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/unable to reach the server/i);
    expect(screen.getByLabelText('Message')).toHaveValue('Do you offer group discounts?');
  });
});
