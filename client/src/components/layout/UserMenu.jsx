import { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router';
import { AnimatePresence, motion } from 'motion/react';
import { useAuth, useLogout } from '../../context/authContext';
import { initials } from '../../utils/format';

/** Account dropdown following the ARIA menu-button pattern. */
export default function UserMenu({ light = false }) {
  const { user, isAdmin } = useAuth();
  const logout = useLogout();
  const [open, setOpen] = useState(false);
  const buttonRef = useRef(null);
  const menuRef = useRef(null);
  const menuId = useId();

  const items = () => [...(menuRef.current?.querySelectorAll('[role="menuitem"]') ?? [])];
  const focusItem = (index) => {
    const list = items();
    list[(index + list.length) % list.length]?.focus();
  };

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (e) => {
      if (!menuRef.current?.contains(e.target) && !buttonRef.current?.contains(e.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open]);

  const close = (returnFocus = true) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  };

  const onButtonKeyDown = (e) => {
    if (['ArrowDown', 'Enter', ' '].includes(e.key) || e.key === 'ArrowUp') {
      e.preventDefault();
      setOpen(true);
      requestAnimationFrame(() => focusItem(e.key === 'ArrowUp' ? -1 : 0));
    }
  };

  const onMenuKeyDown = (e) => {
    const list = items();
    const index = list.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusItem(index + 1);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusItem(index - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      focusItem(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      focusItem(-1);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'Tab') {
      close(false);
    }
  };

  const onLogout = async () => {
    close(false);
    await logout();
  };

  const firstName = user.name.split(/\s+/)[0];

  return (
    <div className="user-menu">
      <button
        ref={buttonRef}
        type="button"
        className={`user-menu__button ${light ? 'is-light' : ''}`}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onButtonKeyDown}
      >
        <span className="user-menu__avatar" aria-hidden="true">
          {initials(user.name)}
        </span>
        <span className="user-menu__name">
          <span className="visually-hidden">Account menu for </span>
          {firstName}
        </span>
        <i className="bi bi-chevron-down user-menu__chevron" aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label="Account"
            className="user-menu__list"
            onKeyDown={onMenuKeyDown}
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16 }}
          >
            <div className="user-menu__header" role="none">
              <strong>{user.name}</strong>
              <small>{user.email}</small>
            </div>
            {isAdmin && (
              <Link role="menuitem" to="/admin" className="user-menu__item" onClick={() => close(false)}>
                <i className="bi bi-speedometer2" aria-hidden="true" /> Dashboard
              </Link>
            )}
            <Link role="menuitem" to="/profile" className="user-menu__item" onClick={() => close(false)}>
              <i className="bi bi-person" aria-hidden="true" /> Profile
            </Link>
            <Link role="menuitem" to="/my-bookings" className="user-menu__item" onClick={() => close(false)}>
              <i className="bi bi-suitcase2" aria-hidden="true" /> My Bookings
            </Link>
            <div className="user-menu__divider" role="separator" />
            <button role="menuitem" type="button" className="user-menu__item" onClick={onLogout}>
              <i className="bi bi-box-arrow-right" aria-hidden="true" /> Log out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
