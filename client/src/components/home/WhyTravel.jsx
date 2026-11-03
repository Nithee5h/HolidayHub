import { photos } from '../../data/images';
import SectionHeading from '../ui/SectionHeading';
import SmartImage from '../ui/SmartImage';
import { Reveal, RevealGroup, RevealItem } from '../ui/Reveal';

const reasons = [
  {
    icon: 'pin-map',
    title: 'Handpicked destinations',
    text: 'A focused collection of places across India and abroad, each with a complete day-by-day itinerary.',
  },
  {
    icon: 'piggy-bank',
    title: 'Affordable packages',
    text: 'Options from weekend budget breaks to luxury escapes, with per-person pricing shown up front.',
  },
  {
    icon: 'shield-check',
    title: 'Trusted, transparent booking',
    text: 'Inclusions, exclusions and seat availability are listed clearly before you reserve anything.',
  },
  {
    icon: 'chat-heart',
    title: 'Customer support',
    text: 'Questions before or after booking? Reach us through the contact page and we’ll help you plan.',
  },
];

export default function WhyTravel() {
  return (
    <section className="section why" aria-labelledby="why-title">
      <div className="container">
        <div className="row g-4 g-lg-5 align-items-center">
          <div className="col-lg-5">
            <Reveal className="why__collage">
              <div className="why__photo why__photo--main">
                <SmartImage src={photos.travelFlatlay.url} alt={photos.travelFlatlay.alt} sizes="(min-width: 992px) 30vw, 70vw" width={900} />
              </div>
              <div className="why__photo why__photo--accent">
                <SmartImage src={photos.alpineLake.url} alt={photos.alpineLake.alt} sizes="(min-width: 992px) 18vw, 45vw" width={600} />
              </div>
              <div className="why__badge glass">
                <i className="bi bi-compass" aria-hidden="true" />
                <span>
                  <strong>8 destinations</strong>
                  <small>India &amp; international</small>
                </span>
              </div>
            </Reveal>
          </div>

          <div className="col-lg-7">
            <SectionHeading
              id="why-title"
              eyebrow="Why travel with us"
              title="Planning made simple, trips made memorable"
              subtitle="We keep the details clear so you can focus on the journey."
            />
            <RevealGroup className="row g-4">
              {reasons.map((r) => (
                <RevealItem key={r.title} className="col-sm-6">
                  <div className="why__card">
                    <span className="why__icon" aria-hidden="true">
                      <i className={`bi bi-${r.icon}`} />
                    </span>
                    <h3 className="why__title">{r.title}</h3>
                    <p className="why__text">{r.text}</p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </div>
      </div>
    </section>
  );
}
