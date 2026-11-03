import { useCallback, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { motion } from 'motion/react';
import { useAuth } from '../../context/authContext';
import { useScrolled } from '../../hooks/useScrolled';
import BrandMark from '../ui/BrandMark';
import Button from '../ui/Button';
import MobileNav from './MobileNav';
import UserMenu from './UserMenu';
import { navLinks } from './navLinks';
import './Navbar.css';

export function Brand({ light = false }) {
  return (
    <Link to="/" className={`hh-brand ${light ? 'hh-brand--light' : ''}`} aria-label="HolidayHub home">
      <span className="hh-brand__mark" aria-hidden="true">
        <BrandMark size={38} />
      </span>
      <span className="hh-brand__word">
        Holiday<span>Hub</span>
      </span>
    </Link>
  );
}

export default function Navbar() {
  const { pathname } = useLocation();
  const { status } = useAuth();
  const scrolled = useScrolled(40);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleRef = useRef(null);
  const closeMenu = useCallback(() => setMenuOpen(false), []);

  // Transparent only while sitting over the homepage hero.
  const overHero = pathname === '/' && !scrolled && !menuOpen;

  return (
    <header className={`hh-nav ${overHero ? 'hh-nav--transparent' : 'hh-nav--solid'}`}>
      <nav className="container hh-nav__inner" aria-label="Main">
        <Brand light={overHero} />

        <ul className="hh-nav__links d-none d-xl-flex">
          {navLinks.map((link) => (
            <li key={link.to}>
              <NavLink to={link.to} end={link.end} className="hh-nav__link">
                {({ isActive }) => (
                  <>
                    {link.label}
                    {isActive && (
                      <motion.span
                        layoutId="nav-active-indicator"
                        className="hh-nav__indicator"
                        transition={{ type: 'spring', stiffness: 420, damping: 34 }}
                      />
                    )}
                  </>
                )}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="hh-nav__actions d-none d-xl-flex">
          {status === 'authenticated' && <UserMenu light={overHero} />}
          {status === 'anonymous' && (
            <>
              <Button to="/login" variant={overHero ? 'outline-light' : 'outline'} size="sm">
                Log In
              </Button>
              <Button to="/register" variant="primary" size="sm">
                Register
              </Button>
            </>
          )}
        </div>

        <button
          ref={toggleRef}
          type="button"
          className="hh-nav__toggle d-xl-none"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className={`hh-burger ${menuOpen ? 'is-open' : ''}`} aria-hidden="true">
            <span />
            <span />
            <span />
          </span>
        </button>
      </nav>

      <MobileNav open={menuOpen} onClose={closeMenu} returnFocusRef={toggleRef} />
    </header>
  );
}
