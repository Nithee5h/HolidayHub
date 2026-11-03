import SectionHeading from '../ui/SectionHeading';
import { RevealGroup, RevealItem } from '../ui/Reveal';

/*
 * Illustrative sample content only — not real customer reviews.
 * Replace with verified post-trip reviews once bookings exist.
 */
const samples = [
  {
    quote: 'The houseboat night was the highlight — the itinerary was clear enough that our kids knew what was coming each day.',
    name: 'Sample traveller',
    trip: 'Kerala Backwaters Escape',
    initials: 'KB',
  },
  {
    quote: 'Seeing every inclusion and exclusion before paying made it easy to compare honeymoon options side by side.',
    name: 'Sample couple',
    trip: 'Bali Island Romance',
    initials: 'BR',
  },
  {
    quote: 'A beginner-friendly trek with a proper day-wise plan. Exactly the kind of detail I look for before booking.',
    name: 'Sample trekker',
    trip: 'Manali Snow Trek',
    initials: 'MS',
  },
];

export default function Testimonials() {
  return (
    <section className="section" aria-labelledby="stories-title">
      <div className="container">
        <SectionHeading
          id="stories-title"
          eyebrow="Traveller stories"
          title="The kind of trips we plan for"
          subtitle="These are illustrative sample stories for this demo, not verified reviews from real customers."
          align="center"
        />
        <RevealGroup className="row g-4">
          {samples.map((s) => (
            <RevealItem key={s.trip} className="col-md-4">
              <figure className="story-card">
                <span className="story-card__badge">
                  <i className="bi bi-info-circle" aria-hidden="true" /> Sample content
                </span>
                <blockquote>
                  <p>“{s.quote}”</p>
                </blockquote>
                <figcaption>
                  <span className="story-card__avatar" aria-hidden="true">
                    {s.initials}
                  </span>
                  <span>
                    <strong>{s.name}</strong>
                    <small>{s.trip}</small>
                  </span>
                </figcaption>
              </figure>
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
