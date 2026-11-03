import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { photos } from '../data/images';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { EMAIL_RE, useForm } from '../hooks/useForm';
import { sendContactMessage } from '../services/contact';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import TextField from '../components/ui/TextField';
import './Contact.css';

const EMPTY = { name: '', email: '', subject: '', message: '' };
const MESSAGE_MAX = 2000;

/** Mirrors the server's rules so most mistakes are caught before submitting. */
const validate = (v) => ({
  ...(v.name.trim().length < 2 && { name: 'Please enter your name.' }),
  ...(!EMAIL_RE.test(v.email.trim()) && { email: 'Please enter a valid email address.' }),
  ...(v.message.trim().length < 10 && { message: 'Message must be at least 10 characters.' }),
  ...(v.message.trim().length > MESSAGE_MAX && { message: `Message must be under ${MESSAGE_MAX} characters.` }),
});

export default function Contact() {
  useDocumentTitle('Contact');
  const form = useForm(EMPTY, validate);
  const [status, setStatus] = useState('idle'); // idle | submitting | sent
  const [formError, setFormError] = useState('');
  const { values } = form;

  const onSubmit = async (e) => {
    e.preventDefault();
    if (status === 'submitting') return;
    const invalid = form.validateAll();
    if (invalid) {
      document.getElementById(`contact-${invalid}`)?.focus();
      return;
    }

    setStatus('submitting');
    setFormError('');
    try {
      await sendContactMessage({ ...values, subject: values.subject.trim() || undefined });
      setStatus('sent');
      form.reset();
    } catch (err) {
      setStatus('idle');
      form.applyServerErrors(err.details);
      setFormError(err.status === 429 ? err.message : err.details?.length ? 'Please fix the highlighted fields.' : err.message);
    }
  };

  const field = (name) => ({
    id: `contact-${name}`,
    name,
    value: values[name],
    onChange: form.handleChange,
    onBlur: form.handleBlur,
    error: form.errors[name],
  });

  return (
    <>
      <PageHeader
        eyebrow="Contact"
        title="Get in touch"
        subtitle="Questions about a package or planning a group trip? Send us a message."
        photo={photos.travelFlatlay}
      />
      <section className="section-tight">
        <div className="container">
          <div className="row g-4 g-lg-5">
            <div className="col-lg-4">
              <div className="contact-info surface-card">
                <h2 className="font-display">How this works</h2>
                <ul>
                  <li>
                    <i className="bi bi-database-check" aria-hidden="true" />
                    <span>Your message is stored securely on the HolidayHub server for the team to review.</span>
                  </li>
                  <li>
                    <i className="bi bi-envelope-slash" aria-hidden="true" />
                    <span>We don’t send automatic emails, and we never share your details.</span>
                  </li>
                  <li>
                    <i className="bi bi-mortarboard" aria-hidden="true" />
                    <span>HolidayHub is an academic demo project, so replies aren’t guaranteed.</span>
                  </li>
                </ul>
              </div>
            </div>

            <div className="col-lg-8">
              <div className="surface-card p-4 p-md-5">
                <AnimatePresence mode="wait" initial={false}>
                  {status === 'sent' ? (
                    <motion.div
                      key="sent"
                      className="contact-success"
                      role="status"
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                    >
                      <span className="contact-success__icon" aria-hidden="true">
                        <i className="bi bi-check2" />
                      </span>
                      <h2 className="font-display">Message received</h2>
                      <p>Thanks for reaching out. Your message has been saved for the HolidayHub team.</p>
                      <Button variant="outline" onClick={() => setStatus('idle')}>
                        Send another message
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.form key="form" noValidate onSubmit={onSubmit} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                      {formError && (
                        <div className="alert alert-danger" role="alert">
                          {formError}
                        </div>
                      )}
                      <div className="row g-3">
                        <div className="col-md-6">
                          <TextField {...field('name')} label="Your name" autoComplete="name" maxLength={80} />
                        </div>
                        <div className="col-md-6">
                          <TextField {...field('email')} type="email" label="Email" autoComplete="email" maxLength={254} />
                        </div>
                      </div>
                      <TextField {...field('subject')} label="Subject (optional)" maxLength={120} />
                      <TextField
                        {...field('message')}
                        as="textarea"
                        rows={6}
                        label="Message"
                        maxLength={MESSAGE_MAX}
                        hint={`${values.message.length}/${MESSAGE_MAX} characters`}
                      />
                      <Button type="submit" variant="primary" size="lg" icon={status === 'submitting' ? undefined : 'send'} disabled={status === 'submitting'}>
                        {status === 'submitting' ? 'Sending…' : 'Send message'}
                      </Button>
                    </motion.form>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
