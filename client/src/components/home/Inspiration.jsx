import { Link } from 'react-router';
import { photos } from '../../data/images';
import { useAsync } from '../../hooks/useAsync';
import { getFacets } from '../../services/catalog';
import SectionHeading from '../ui/SectionHeading';
import SmartImage from '../ui/SmartImage';
import { RevealGroup, RevealItem } from '../ui/Reveal';

const themes = [
  { theme: 'romantic', title: 'Romantic Getaways', text: 'Pool villas, candlelit dinners and sunsets for two.', photo: photos.venice },
  { theme: 'mountains', title: 'Mountain Adventures', text: 'Snow trails, alpine railways and glacier views.', photo: photos.hikers },
  { theme: 'tropical', title: 'Tropical Escapes', text: 'Palm-fringed beaches, lagoons and backwaters.', photo: photos.resortPool },
  { theme: 'culture', title: 'Cultural Experiences', text: 'Heritage quarters, temples, food and festivals.', photo: photos.cinqueTerre },
];

export default function Inspiration() {
  const { data: facets } = useAsync(getFacets, []);
  const themeCounts = Object.fromEntries((facets?.themes ?? []).map((t) => [t.name, t.count]));

  return (
    <section className="section inspiration" aria-labelledby="inspiration-title">
      <div className="container">
        <SectionHeading
          id="inspiration-title"
          eyebrow="Travel inspiration"
          title="What kind of escape are you dreaming of?"
          align="center"
          light
        />
        <RevealGroup className="inspiration__grid">
          {themes.map((t, i) => {
            const count = themeCounts[t.theme];
            return (
              <RevealItem key={t.theme} className={`inspiration__item inspiration__item--${i + 1}`}>
                <Link to={`/packages?theme=${t.theme}`} className="inspiration__card">
                  <SmartImage src={t.photo.url} alt={t.photo.alt} sizes="(min-width: 992px) 33vw, 100vw" width={900} className="inspiration__img" />
                  <div className="inspiration__body">
                    {count !== undefined && (
                      <span className="inspiration__count">
                        {count} {count === 1 ? 'package' : 'packages'}
                      </span>
                    )}
                    <h3 className="font-display">{t.title}</h3>
                    <p>{t.text}</p>
                    <span className="inspiration__link">
                      Discover <i className="bi bi-arrow-right" aria-hidden="true" />
                    </span>
                  </div>
                </Link>
              </RevealItem>
            );
          })}
        </RevealGroup>
      </div>
    </section>
  );
}
