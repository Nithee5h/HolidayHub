import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '../context/authContext';
import { photos } from '../data/images';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { EMAIL_RE, useForm } from '../hooks/useForm';
import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/ui/Button';
import PasswordField from '../components/ui/PasswordField';
import TextField from '../components/ui/TextField';

const validate = (v) => ({
  ...(!EMAIL_RE.test(v.email.trim()) && { email: 'Please enter a valid email address.' }),
  ...(!v.password && { password: 'Please enter your password.' }),
});

export default function Login() {
  useDocumentTitle('Log in');
  const { login } = useAuth();
  const [params] = useSearchParams();
  const next = params.get('next');
  const form = useForm({ email: '', password: '' }, validate);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const invalid = form.validateAll();
    if (invalid) {
      document.getElementById(`login-${invalid}`)?.focus();
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      // On success GuestOnly redirects to `next` (or home).
      await login({ email: form.values.email.trim(), password: form.values.password });
    } catch (err) {
      setSubmitting(false);
      form.applyServerErrors(err.details);
      setFormError(err.status === 401 || err.status === 429 || err.status === 0 ? err.message : 'We couldn’t log you in. Please try again.');
    }
  };

  const registerHref = next ? `/register?next=${encodeURIComponent(next)}` : '/register';

  return (
    <AuthLayout
      photo={photos.alpineLake}
      quote="Every journey begins with a single step — let’s pick up where you left off."
      title="Welcome back"
      subtitle={next ? 'Log in to continue.' : 'Log in to manage your trips and bookings.'}
      footer={
        <>
          New to HolidayHub? <Link to={registerHref}>Create an account</Link>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit}>
        {formError && (
          <div className="alert alert-danger" role="alert">
            {formError}
          </div>
        )}
        <TextField
          id="login-email"
          name="email"
          type="email"
          label="Email"
          autoComplete="email"
          value={form.values.email}
          onChange={form.handleChange}
          onBlur={form.handleBlur}
          error={form.errors.email}
        />
        <PasswordField
          id="login-password"
          name="password"
          label="Password"
          autoComplete="current-password"
          value={form.values.password}
          onChange={form.handleChange}
          onBlur={form.handleBlur}
          error={form.errors.password}
        />
        <Button type="submit" variant="primary" size="lg" block disabled={submitting}>
          {submitting ? 'Logging in…' : 'Log in'}
        </Button>
      </form>
    </AuthLayout>
  );
}
