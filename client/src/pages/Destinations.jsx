import { destinations } from '../data/destinations';
import { photos } from '../data/images';
import { useAsync } from '../hooks/useAsync';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { getFacets } from '../services/catalog';
import PageHeader from '../components/layout/PageHeader';
import SectionHeading from '../components/ui/SectionHeading';
import { RevealGroup, RevealItem } from '../components/ui/Reveal';
import DestinationCard from '../components/travel/DestinationCard';

const groups = [
  { region: 'India', title: 'Incredible India', subtitle: 'Backwaters, beaches and Himalayan trails close to home.' },
  { region: 'International', title: 'Around the world', subtitle: 'Island lagoons, alpine valleys and iconic cities.' },
];

export default function Destinations() {
  useDocumentTitle('Explore Destinations');
  const { data: facets } = useAsync(getFacets, []);
  const stats = Object.fromEntries((facets?.destinations ?? []).map((d) => [d.name, d]));
  return (
    <>
      <PageHeader
        eyebrow="Explore destinations"
        title="Where will you go next?"
        subtitle="Pick a destination to see every holiday package available there."
        photo={photos.mountainsAbove}
      />
      {groups.map((g) => (
        <section key={g.region} className="section-tight" aria-labelledby={`region-${g.region}`}>
          <div className="container">
            <SectionHeading id={`region-${g.region}`} eyebrow={g.region} title={g.title} subtitle={g.subtitle} />
            <RevealGroup className="row g-4">
              {destinations
                .filter((d) => d.region === g.region)
                .map((d) => (
                  <RevealItem key={d.slug} className="col-sm-6 col-lg-3" style={{ height: 340 }}>
                    <DestinationCard
                      destination={d}
                      packageCount={stats[d.name]?.count}
                      startingPrice={stats[d.name]?.minPrice}
                      sizes="(min-width: 992px) 25vw, (min-width: 576px) 50vw, 100vw"
                    />
                  </RevealItem>
                ))}
            </RevealGroup>
          </div>
        </section>
      ))}
    </>
  );
}
