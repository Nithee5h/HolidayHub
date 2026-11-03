import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { useAuth } from '../context/authContext';
import { photos } from '../data/images';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { EMAIL_RE, PHONE_RE, useForm } from '../hooks/useForm';
import { meetsPasswordPolicy, passwordRules, passwordScore, scoreLabel } from '../utils/password';
import AuthLayout from '../components/auth/AuthLayout';
import Button from '../components/ui/Button';
import PasswordField from '../components/ui/PasswordField';
import TextField from '../components/ui/TextField';

const FIELDS = ['name', 'email', 'phone', 'password', 'confirm'];

const validate = (v) => ({
  ...(v.name.trim().length < 2 && { name: 'Please enter your name.' }),
  ...(!EMAIL_RE.test(v.email.trim()) && { email: 'Please enter a valid email address.' }),
  ...(v.phone.trim() && !PHONE_RE.test(v.phone.trim()) && { phone: 'Please enter a valid phone number.' }),
  ...(!meetsPasswordPolicy(v.password) && { password: 'Password doesn’t meet the requirements below.' }),
  ...((!v.confirm || v.confirm !== v.password) && { confirm: 'Passwords don’t match.' }),
});

export default function Register() {
  useDocumentTitle('Create an account');
  const { register } = useAuth();
  const [params] = useSearchParams();
  const next = params.get('next');
  const form = useForm({ name: '', email: '', phone: '', password: '', confirm: '' }, validate);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const { values } = form;
  const score = passwordScore(values.password);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (submitting) return;
    const invalid = form.validateAll();
    if (invalid) {
      document.getElementById(`register-${invalid}`)?.focus();
      return;
    }
    setSubmitting(true);
    setFormError('');
    try {
      await register({ name: values.name.trim(), email: values.email.trim(), phone: values.phone.trim(), password: values.password });
    } catch (err) {
      setSubmitting(false);
      form.applyServerErrors(err.details);
      const firstField = err.details?.find((d) => FIELDS.includes(d.field))?.field;
      if (firstField) document.getElementById(`register-${firstField}`)?.focus();
      setFormError(err.details?.length ? 'Please fix the highlighted fields.' : err.message);
    }
  };

  const field = (name) => ({
    id: `register-${name}`,
    name,
    value: values[name],
    onChange: form.handleChange,
    onBlur: form.handleBlur,
    error: form.errors[name],
  });

  return (
    <AuthLayout
      photo={photos.baliTerraces}
      quote="Save your favourite trips, book in minutes and keep every itinerary in one place."
      title="Create your account"
      subtitle="It takes less than a minute."
      footer={
        <>
          Already have an account? <Link to={next ? `/login?next=${encodeURIComponent(next)}` : '/login'}>Log in</Link>
        </>
      }
    >
      <form noValidate onSubmit={onSubmit}>
        {formError && (
          <div className="alert alert-danger" role="alert">
            {formError}
          </div>
        )}
        <TextField {...field('name')} label="Full name" autoComplete="name" maxLength={80} />
        <TextField {...field('email')} type="email" label="Email" autoComplete="email" maxLength={254} />
        <TextField {...field('phone')} type="tel" label="Phone (optional)" autoComplete="tel" maxLength={20} hint="Only used about your bookings." />
        <PasswordField {...field('password')} label="Password" autoComplete="new-password" maxLength={72} />
        {values.password && (
          <div className="pw-meter" data-score={score} role="img" aria-label={`Password strength: ${scoreLabel[score]}`}>
            <span />
            <span />
            <span />
            <span />
          </div>
        )}
        <ul className="pw-rules" aria-label="Password requirements">
          {passwordRules.map((r) => {
            const met = r.test(values.password);
            return (
              <li key={r.id} className={met ? 'is-met' : ''}>
                <i className={`bi bi-${met ? 'check-circle-fill' : 'circle'}`} aria-hidden="true" />
                {r.label}
                <span className="visually-hidden">{met ? ' (met)' : ' (not met)'}</span>
              </li>
            );
          })}
        </ul>
        <PasswordField {...field('confirm')} label="Confirm password" autoComplete="new-password" maxLength={72} />
        <Button type="submit" variant="primary" size="lg" block disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
        <p className="form-text text-center mt-3 mb-0">Accounts are for this academic demo. No real bookings or payments are made.</p>
      </form>
    </AuthLayout>
  );
}
