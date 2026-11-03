import { destinations } from '../../data/destinations';
import { useAsync } from '../../hooks/useAsync';
import { getFacets } from '../../services/catalog';
import Button from '../ui/Button';
import SectionHeading from '../ui/SectionHeading';
import { RevealGroup, RevealItem } from '../ui/Reveal';
import DestinationCard from '../travel/DestinationCard';

export default function PopularDestinations() {
  // Counts are an enhancement: cards render immediately and fill in when facets arrive.
  const { data: facets } = useAsync(getFacets, []);
  const stats = Object.fromEntries((facets?.destinations ?? []).map((d) => [d.name, d]));

  return (
    <section className="section" aria-labelledby="popular-destinations">
      <div className="container">
        <SectionHeading
          id="popular-destinations"
          eyebrow="Popular destinations"
          title="Places travellers keep coming back to"
          subtitle="From Himalayan snow trails to Maldivian lagoons — pick a place and see every package we offer there."
          action={
            <Button to="/destinations" variant="outline" iconEnd="arrow-right">
              All destinations
            </Button>
          }
        />

        <RevealGroup className="bento" stagger={0.07}>
          {destinations.map((d, i) => (
            <RevealItem key={d.slug} className={`bento__item bento__item--${i + 1}`}>
              <DestinationCard
                destination={d}
                size={i === 0 ? 'lg' : 'md'}
                sizes={i === 0 ? '(min-width: 992px) 50vw, 100vw' : '(min-width: 992px) 25vw, 50vw'}
                packageCount={stats[d.name]?.count}
                startingPrice={stats[d.name]?.minPrice}
              />
            </RevealItem>
          ))}
        </RevealGroup>
      </div>
    </section>
  );
}
