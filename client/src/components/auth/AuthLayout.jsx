import { motion } from 'motion/react';
import SmartImage from '../ui/SmartImage';
import './AuthLayout.css';

/** Split layout for login/register: destination photography + form panel. */
export default function AuthLayout({ photo, quote, title, subtitle, children, footer }) {
  return (
    <section className="auth">
      <div className="auth__media" aria-hidden="true">
        <SmartImage src={photo.url} alt="" eager width={1400} sizes="50vw" />
        <div className="auth__media-copy">
          <p className="font-display">{quote}</p>
        </div>
      </div>
      <div className="auth__panel">
        <motion.div
          className="auth__card"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="auth__title font-display">{title}</h1>
          {subtitle && <p className="auth__subtitle">{subtitle}</p>}
          {children}
          {footer && <div className="auth__footer">{footer}</div>}
        </motion.div>
      </div>
    </section>
  );
}
