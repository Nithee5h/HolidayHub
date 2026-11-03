import { useRef } from 'react';
import { NavLink } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth, useLogout } from '../../context/authContext';
import { useModalBehavior } from '../../hooks/useModalBehavior';
import { initials } from '../../utils/format';
import Button from '../ui/Button';
import { navLinks } from './navLinks';

const EASE = [0.22, 1, 0.36, 1];

/** Off-canvas navigation for < xl screens: modal dialog with focus trap. */
export default function MobileNav({ open, onClose, returnFocusRef }) {
  const panelRef = useRef(null);

  const { status, user, isAdmin } = useAuth();
  const logout = useLogout();
  useModalBehavior(open, panelRef, onClose, returnFocusRef);

  const onLogout = async () => {
    onClose();
    await logout();
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="mobile-nav" id="mobile-nav">
          <motion.div
            className="mobile-nav__backdrop"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
          />
          <motion.div
            ref={panelRef}
            className="mobile-nav__panel"
            role="dialog"
            aria-modal="true"
            aria-label="Site navigation"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: EASE }}
          >
            <div className="mobile-nav__head">
              <span className="mobile-nav__title font-display">Where to next?</span>
              <button type="button" className="mobile-nav__close" onClick={onClose} aria-label="Close menu">
                <i className="bi bi-x-lg" aria-hidden="true" />
              </button>
            </div>

            <motion.ul
              className="mobile-nav__links"
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.05, delayChildren: 0.12 } } }}
            >
              {navLinks.map((link) => (
                <motion.li
                  key={link.to}
                  variants={{ hidden: { opacity: 0, x: 24 }, visible: { opacity: 1, x: 0, transition: { ease: EASE } } }}
                >
                  <NavLink to={link.to} end={link.end} className="mobile-nav__link" onClick={onClose}>
                    {link.label}
                    <i className="bi bi-arrow-right" aria-hidden="true" />
                  </NavLink>
                </motion.li>
              ))}
            </motion.ul>

            <div className="mobile-nav__actions">
              {status === 'authenticated' ? (
                <>
                  <div className="mobile-nav__account">
                    <span className="user-menu__avatar" aria-hidden="true">
                      {initials(user.name)}
                    </span>
                    <span>
                      <strong>{user.name}</strong>
                      <small>{user.email}</small>
                    </span>
                  </div>
                  {isAdmin && (
                    <Button to="/admin" variant="ocean" icon="speedometer2" block onClick={onClose}>
                      Dashboard
                    </Button>
                  )}
                  <Button to="/profile" variant="outline" icon="person" block onClick={onClose}>
                    Profile
                  </Button>
                  <Button variant="ghost" icon="box-arrow-right" block onClick={onLogout}>
                    Log out
                  </Button>
                </>
              ) : (
                <>
                  <Button to="/login" variant="outline" block onClick={onClose}>
                    Log In
                  </Button>
                  <Button to="/register" variant="primary" block onClick={onClose}>
                    Register
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
