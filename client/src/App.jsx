import { lazy } from 'react';
import { Route, Routes } from 'react-router';
import { MotionConfig } from 'motion/react';
import GuestOnly from './components/auth/GuestOnly';
import RequireAuth from './components/auth/RequireAuth';
import Layout from './components/layout/Layout';
import AuthProvider from './context/AuthProvider';
import ToastProvider from './context/ToastProvider';
import Home from './pages/Home';
import NotFound from './pages/NotFound';

// Route-level code splitting: only the homepage and 404 ship in the main bundle.
const Packages = lazy(() => import('./pages/Packages'));
const PackageDetails = lazy(() => import('./pages/PackageDetails'));
const Destinations = lazy(() => import('./pages/Destinations'));
const About = lazy(() => import('./pages/About'));
const BookingDetails = lazy(() => import('./pages/BookingDetails'));
const Checkout = lazy(() => import('./pages/Checkout'));
const Contact = lazy(() => import('./pages/Contact'));
const Login = lazy(() => import('./pages/Login'));
const MyBookings = lazy(() => import('./pages/MyBookings'));
const Profile = lazy(() => import('./pages/Profile'));
const Register = lazy(() => import('./pages/Register'));
const AdminLayout = lazy(() => import('./components/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('./pages/admin/AdminDashboard'));
const AdminPackages = lazy(() => import('./pages/admin/AdminPackages'));
const AdminPackageEdit = lazy(() => import('./pages/admin/AdminPackageEdit'));
const AdminBookings = lazy(() => import('./pages/admin/AdminBookings'));
const AdminCustomers = lazy(() => import('./pages/admin/AdminCustomers'));

export default function App() {
  return (
    // "user" honours prefers-reduced-motion: transforms are skipped, opacity fades remain.
    <MotionConfig reducedMotion="user">
      <AuthProvider>
        <ToastProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="destinations" element={<Destinations />} />
              <Route path="packages" element={<Packages />} />
              <Route path="packages/:id" element={<PackageDetails />} />
              <Route
                path="booking/:departureId"
                element={
                  <RequireAuth>
                    <Checkout />
                  </RequireAuth>
                }
              />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route
                path="login"
                element={
                  <GuestOnly>
                    <Login />
                  </GuestOnly>
                }
              />
              <Route
                path="register"
                element={
                  <GuestOnly>
                    <Register />
                  </GuestOnly>
                }
              />
              <Route
                path="profile"
                element={
                  <RequireAuth>
                    <Profile />
                  </RequireAuth>
                }
              />
              <Route
                path="my-bookings"
                element={
                  <RequireAuth>
                    <MyBookings />
                  </RequireAuth>
                }
              />
              <Route
                path="my-bookings/:id"
                element={
                  <RequireAuth>
                    <BookingDetails />
                  </RequireAuth>
                }
              />
              <Route
                path="admin"
                element={
                  <RequireAuth role="admin">
                    <AdminLayout />
                  </RequireAuth>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="packages" element={<AdminPackages />} />
                <Route path="packages/:id" element={<AdminPackageEdit />} />
                <Route path="bookings" element={<AdminBookings />} />
                <Route path="customers" element={<AdminCustomers />} />
              </Route>
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </MotionConfig>
  );
}
