import { photos } from '../data/images';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import PageHeader from '../components/layout/PageHeader';
import Button from '../components/ui/Button';
import SmartImage from '../components/ui/SmartImage';
import { Reveal, RevealGroup, RevealItem } from '../components/ui/Reveal';

const principles = [
  { icon: 'list-check', title: 'Clarity first', text: 'Day-by-day itineraries, inclusions and exclusions on every package.' },
  { icon: 'currency-rupee', title: 'Honest pricing', text: 'Per-person prices shown up front, alongside exactly what is and isn’t included.' },
  { icon: 'universal-access', title: 'Built for everyone', text: 'Responsive layouts, keyboard support and reduced-motion friendly animation.' },
];

export default function About() {
  useDocumentTitle('About');
  return (
    <>
      <PageHeader
        eyebrow="About HolidayHub"
        title="A modern way to discover and book holidays"
        subtitle="HolidayHub is a Full Stack Development course project that demonstrates a complete MERN booking platform."
        photo={photos.oldTown}
      />
      <section className="section">
        <div className="container">
          <div className="row g-4 g-lg-5 align-items-center">
            <div className="col-lg-6">
              <Reveal>
                <h2 className="font-display" style={{ fontSize: 'var(--hh-fs-2xl)' }}>
                  What this project is
                </h2>
                <p className="text-muted-hh">
                  HolidayHub lets visitors browse handpicked domestic and international packages, compare itineraries, choose a
                  departure and complete a <strong>simulated</strong> checkout. Administrators manage packages, departures,
                  capacity and bookings.
                </p>
                <p className="text-muted-hh">
                  It is an academic demonstration built with React, Bootstrap, Node.js, Express and MongoDB. HolidayHub is not a
                  registered travel operator; packages, prices and stories shown here are illustrative demo content and no real
                  payments are taken.
                </p>
                <Button to="/packages" variant="ocean" iconEnd="arrow-right" className="mt-2">
                  Browse packages
                </Button>
              </Reveal>
            </div>
            <div className="col-lg-6">
              <Reveal delay={0.1}>
                <div style={{ aspectRatio: '4 / 3', borderRadius: 'var(--hh-radius-lg)', overflow: 'hidden', boxShadow: 'var(--hh-shadow-lg)' }}>
                  <SmartImage src={photos.roadTrip.url} alt={photos.roadTrip.alt} sizes="(min-width: 992px) 50vw, 100vw" width={1000} />
                </div>
              </Reveal>
            </div>
          </div>

          <RevealGroup className="row g-4 mt-5">
            {principles.map((p) => (
              <RevealItem key={p.title} className="col-md-4">
                <div className="surface-card h-100 p-4 hover-lift">
                  <i className={`bi bi-${p.icon} text-coral`} style={{ fontSize: '1.75rem' }} aria-hidden="true" />
                  <h3 className="mt-3" style={{ fontSize: 'var(--hh-fs-lg)' }}>
                    {p.title}
                  </h3>
                  <p className="mb-0 text-muted-hh">{p.text}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>
    </>
  );
}
