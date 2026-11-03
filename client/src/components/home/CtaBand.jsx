import { photos } from '../../data/images';
import Button from '../ui/Button';
import SmartImage from '../ui/SmartImage';
import { Reveal } from '../ui/Reveal';

export default function CtaBand() {
  return (
    <section className="section-tight" aria-labelledby="cta-title">
      <div className="container">
        <Reveal className="cta-band">
          <SmartImage src={photos.mountainsAbove.url} alt="" sizes="100vw" width={1600} className="cta-band__img" />
          <div className="cta-band__content">
            <h2 id="cta-title" className="font-display">
              Ready when you are.
            </h2>
            <p>Compare packages, explore the itinerary day by day and pick a departure that suits you.</p>
            <div className="d-flex flex-wrap gap-3 justify-content-center">
              <Button to="/packages" variant="primary" size="lg" iconEnd="arrow-right">
                Browse packages
              </Button>
              <Button to="/destinations" variant="glass" size="lg">
                Explore destinations
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
