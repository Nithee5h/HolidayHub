import { Link } from 'react-router';
import { useAuth } from '../../context/authContext';
import { destinations } from '../../data/destinations';
import { Brand } from './Navbar';
import './Footer.css';

const exploreLinks = [
  { to: '/packages', label: 'Holiday Packages' },
  { to: '/destinations', label: 'Explore Destinations' },
  { to: '/about', label: 'About HolidayHub' },
  { to: '/contact', label: 'Contact' },
];

const guestLinks = [
  { to: '/login', label: 'Log In' },
  { to: '/register', label: 'Create an account' },
  { to: '/my-bookings', label: 'My Bookings' },
];

const memberLinks = [
  { to: '/profile', label: 'Profile' },
  { to: '/my-bookings', label: 'My Bookings' },
];

export default function Footer() {
  const { status, isAdmin } = useAuth();
  const accountLinks =
    status === 'authenticated' ? [...memberLinks, ...(isAdmin ? [{ to: '/admin', label: 'Admin dashboard' }] : [])] : guestLinks;

  return (
    <footer className="hh-footer">
      <div className="container">
        <div className="row g-4 g-lg-5">
          <div className="col-lg-4">
            <Brand light />
            <p className="hh-footer__intro">
              Handpicked domestic and international holidays with clear day-by-day itineraries, transparent per-person
              pricing and simple online booking.
            </p>
            <p className="hh-footer__note">
              <i className="bi bi-mortarboard" aria-hidden="true" /> HolidayHub is an academic full-stack demo project, not
              a registered tour operator. Packages and prices are illustrative.
            </p>
          </div>

          <nav className="col-6 col-md-4 col-lg-3" aria-labelledby="footer-destinations">
            <h2 id="footer-destinations" className="hh-footer__heading">Destinations</h2>
            <ul className="hh-footer__list hh-footer__list--split">
              {destinations.map((d) => (
                <li key={d.slug}>
                  <Link to={`/packages?destination=${encodeURIComponent(d.name)}`}>{d.name}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="col-6 col-md-4 col-lg-2" aria-labelledby="footer-explore">
            <h2 id="footer-explore" className="hh-footer__heading">Explore</h2>
            <ul className="hh-footer__list">
              {exploreLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="col-6 col-md-4 col-lg-3" aria-labelledby="footer-account">
            <h2 id="footer-account" className="hh-footer__heading">Your account</h2>
            <ul className="hh-footer__list">
              {accountLinks.map((l) => (
                <li key={l.to}>
                  <Link to={l.to}>{l.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="hh-footer__bottom">
          <p>© {new Date().getFullYear()} HolidayHub · Full Stack Development course project</p>
          <p>
            Photography via{' '}
            <a href="https://unsplash.com/license" target="_blank" rel="noreferrer">
              Unsplash
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
