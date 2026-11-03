import { NavLink, Outlet } from 'react-router';
import { motion } from 'motion/react';
import './admin.css';

const LINKS = [
  { to: '/admin', label: 'Dashboard', icon: 'speedometer2', end: true },
  { to: '/admin/packages', label: 'Packages', icon: 'collection' },
  { to: '/admin/bookings', label: 'Bookings', icon: 'journal-check' },
  { to: '/admin/customers', label: 'Customers', icon: 'people' },
];

/** Admin shell: sidebar on desktop, scrollable pill nav on small screens. */
export default function AdminLayout() {
  return (
    <div className="admin page-offset">
      <div className="container-xxl">
        <div className="admin__grid">
          <aside className="admin__sidebar" aria-label="Admin">
            <p className="admin__eyebrow">Admin</p>
            <nav aria-label="Admin sections">
              <ul>
                {LINKS.map((l) => (
                  <li key={l.to}>
                    <NavLink to={l.to} end={l.end} className="admin__link">
                      {({ isActive }) => (
                        <>
                          {isActive && <motion.span layoutId="admin-nav-active" className="admin__link-bg" transition={{ type: 'spring', stiffness: 420, damping: 36 }} />}
                          <i className={`bi bi-${l.icon}`} aria-hidden="true" />
                          <span>{l.label}</span>
                        </>
                      )}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>
            <p className="admin__note">
              <i className="bi bi-info-circle" aria-hidden="true" /> Revenue and payments are simulated (demo).
            </p>
          </aside>
          <div className="admin__main">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}
