import { Navigate, useSearchParams } from 'react-router';
import { useAuth } from '../../context/authContext';
import { safeNext } from '../../utils/redirect';

/** Login/Register: already signed-in users continue to where they were heading. */
export default function GuestOnly({ children }) {
  const { status } = useAuth();
  const [params] = useSearchParams();
  if (status === 'authenticated') return <Navigate to={safeNext(params.get('next'))} replace />;
  return children;
}
