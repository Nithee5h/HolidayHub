import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../../context/authContext';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import Skeleton from '../ui/Skeleton';

function SessionCheck() {
  return (
    <div className="container page-offset pb-5" aria-busy="true" aria-label="Checking your session">
      <Skeleton width="40%" height="2.4rem" className="mb-3" />
      <Skeleton height="240px" radius="var(--hh-radius)" />
    </div>
  );
}

/**
 * Route guard. Anonymous visitors are sent to /login?next=<here>.
 * With `role`, signed-in users without it see a no-access state.
 * (UX only — the API enforces the same rules server-side.)
 */
export default function RequireAuth({ role, children }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <SessionCheck />;
  if (status !== 'authenticated') {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }
  if (role && user.role !== role) {
    return (
      <section className="container page-offset section-tight">
        <EmptyState icon="shield-lock" title="You don’t have access to this page" actions={<Button to="/" variant="ocean">Back to home</Button>}>
          <p>This area is only available to HolidayHub administrators.</p>
        </EmptyState>
      </section>
    );
  }
  return children;
}
