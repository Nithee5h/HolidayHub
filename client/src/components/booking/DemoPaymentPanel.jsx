import { useState } from 'react';
import { payDemo } from '../../services/bookings';
import { formatPrice } from '../../utils/format';
import Button from '../ui/Button';
import HoldCountdown from './HoldCountdown';
import './booking.css';

/**
 * Simulated payment step. There are deliberately NO card fields: the API
 * records a demo transaction only. Double clicks are prevented here and the
 * API is idempotent, so a retried request never creates a second charge.
 */
export default function DemoPaymentPanel({ booking, onPaid, onExpired }) {
  const [state, setState] = useState('idle'); // idle | paying | declined | error | expired
  const [message, setMessage] = useState('');

  const pay = async (outcome) => {
    if (state === 'paying') return;
    setState('paying');
    setMessage('');
    try {
      const result = await payDemo(booking.id, outcome);
      onPaid(result.booking, result.payment);
    } catch (err) {
      if (err.status === 402) {
        setState('declined');
        setMessage(err.message);
      } else if (err.status === 409 && /hold expired/i.test(err.message)) {
        setState('expired');
        setMessage(err.message);
        onExpired?.();
      } else {
        setState('error');
        setMessage(err.message);
      }
    }
  };

  return (
    <div className="demo-pay">
      <div className="demo-pay__banner" role="note">
        <i className="bi bi-shield-check" aria-hidden="true" />
        <div>
          <strong>Demo payment — simulated</strong>
          <p>No card details are needed and no real money is charged. This step only records a demo transaction.</p>
        </div>
      </div>

      <div className="demo-pay__amount">
        <span>Amount due</span>
        <strong>{formatPrice(booking.totalAmount, booking.currency)}</strong>
        {booking.holdExpiresAt && state !== 'expired' && (
          <HoldCountdown
            expiresAt={booking.holdExpiresAt}
            onExpire={() => {
              setState('expired');
              setMessage('Your seat hold expired. Please start a new booking.');
              onExpired?.();
            }}
          />
        )}
      </div>

      {message && (
        <div className={`alert ${state === 'declined' ? 'alert-warning' : 'alert-danger'}`} role="alert">
          {message}
        </div>
      )}

      {state !== 'expired' && (
        <div className="demo-pay__actions">
          <Button variant="primary" size="lg" icon="lock" onClick={() => pay('success')} disabled={state === 'paying'}>
            {state === 'paying' ? 'Processing…' : `Pay ${formatPrice(booking.totalAmount, booking.currency)} (demo)`}
          </Button>
          <Button variant="ghost" onClick={() => pay('decline')} disabled={state === 'paying'}>
            Simulate a declined payment
          </Button>
        </div>
      )}
    </div>
  );
}
