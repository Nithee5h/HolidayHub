import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth, useLogout } from '../context/authContext';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { PHONE_RE, useForm } from '../hooks/useForm';
import { formatDate, initials } from '../utils/format';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import TextField from '../components/ui/TextField';
import './Profile.css';

const validate = (v) => ({
  ...(v.name.trim().length < 2 && { name: 'Please enter your name.' }),
  ...(v.phone.trim() && !PHONE_RE.test(v.phone.trim()) && { phone: 'Please enter a valid phone number.' }),
});

export default function Profile() {
  useDocumentTitle('Your profile');
  const { user, updateProfile } = useAuth();
  const onLogout = useLogout();
  const form = useForm({ name: user.name, phone: user.phone ?? '' }, validate);
  const [status, setStatus] = useState('idle'); // idle | saving | saved
  const [formError, setFormError] = useState('');

  const dirty = form.values.name.trim() !== user.name || form.values.phone.trim() !== (user.phone ?? '');

  const onSubmit = async (e) => {
    e.preventDefault();
    if (status === 'saving' || !dirty) return;
    const invalid = form.validateAll();
    if (invalid) {
      document.getElementById(`profile-${invalid}`)?.focus();
      return;
    }
    setStatus('saving');
    setFormError('');
    try {
      const updated = await updateProfile({ name: form.values.name.trim(), phone: form.values.phone.trim() });
      form.reset({ name: updated.name, phone: updated.phone ?? '' });
      setStatus('saved');
    } catch (err) {
      setStatus('idle');
      form.applyServerErrors(err.details);
      setFormError(err.message);
    }
  };

  return (
    <>
      <PageHeader eyebrow="Your account" title="Profile" subtitle="Keep your contact details up to date for your bookings." />
      <section className="section-tight">
        <div className="container">
          <div className="row g-4 g-lg-5">
            <div className="col-lg-4">
              <div className="profile-card surface-card">
                <span className="profile-card__avatar" aria-hidden="true">
                  {initials(user.name)}
                </span>
                <h2 className="profile-card__name">{user.name}</h2>
                <p className="profile-card__email">{user.email}</p>
                {user.role === 'admin' && (
                  <span className="profile-card__badge">
                    <i className="bi bi-shield-check" aria-hidden="true" /> Administrator
                  </span>
                )}
                <p className="profile-card__meta">Member since {formatDate(user.createdAt.slice(0, 10))}</p>
                <div className="d-grid gap-2 mt-3">
                  <Button to="/my-bookings" variant="outline" icon="suitcase2">
                    My bookings
                  </Button>
                  <Button variant="ghost" icon="box-arrow-right" onClick={onLogout}>
                    Log out
                  </Button>
                </div>
              </div>
            </div>

            <div className="col-lg-8">
              <form className="surface-card p-4 p-md-5" noValidate onSubmit={onSubmit} aria-labelledby="profile-form-title">
                <h2 id="profile-form-title" className="font-display mb-4" style={{ fontSize: 'var(--hh-fs-2xl)' }}>
                  Personal details
                </h2>
                {formError && (
                  <div className="alert alert-danger" role="alert">
                    {formError}
                  </div>
                )}
                <TextField
                  id="profile-email"
                  label="Email (account identifier)"
                  value={user.email}
                  readOnly
                  disabled
                  hint="Your email can’t be changed because it identifies your account."
                />
                <TextField
                  id="profile-name"
                  name="name"
                  label="Full name"
                  autoComplete="name"
                  maxLength={80}
                  value={form.values.name}
                  onChange={(e) => {
                    setStatus('idle');
                    form.handleChange(e);
                  }}
                  onBlur={form.handleBlur}
                  error={form.errors.name}
                />
                <TextField
                  id="profile-phone"
                  name="phone"
                  type="tel"
                  label="Phone (optional)"
                  autoComplete="tel"
                  maxLength={20}
                  value={form.values.phone}
                  onChange={(e) => {
                    setStatus('idle');
                    form.handleChange(e);
                  }}
                  onBlur={form.handleBlur}
                  error={form.errors.phone}
                  hint="Leave blank to remove it."
                />
                <div className="d-flex flex-wrap align-items-center gap-3 mt-2">
                  <Button type="submit" variant="primary" disabled={!dirty || status === 'saving'}>
                    {status === 'saving' ? 'Saving…' : 'Save changes'}
                  </Button>
                  <AnimatePresence>
                    {status === 'saved' && (
                      <motion.span className="profile-saved" role="status" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
                        <i className="bi bi-check-circle-fill" aria-hidden="true" /> Profile updated
                      </motion.span>
                    )}
                  </AnimatePresence>
                </div>
              </form>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
