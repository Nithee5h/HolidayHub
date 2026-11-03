import { Suspense } from 'react';
import { Outlet, useLocation } from 'react-router';
import Skeleton from '../ui/Skeleton';
import Navbar from './Navbar';
import Footer from './Footer';
import PageTransition from './PageTransition';
import ScrollToTop from './ScrollToTop';

/** Shown while a lazily loaded page's code downloads (usually a few ms). */
function PageLoading() {
  return (
    <div className="container page-offset pb-5" aria-busy="true" aria-label="Loading page">
      <Skeleton width="35%" height="2.4rem" className="mb-3" />
      <Skeleton height="320px" radius="var(--hh-radius-lg)" />
    </div>
  );
}

export default function Layout() {
  const { pathname } = useLocation();

  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <ScrollToTop />
      <Navbar />
      <main id="main-content" tabIndex={-1}>
        <PageTransition key={pathname}>
          <Suspense fallback={<PageLoading />}>
            <Outlet />
          </Suspense>
        </PageTransition>
      </main>
      <Footer />
    </>
  );
}
