import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { categories } from '../../data/destinations';
import { useAsync } from '../../hooks/useAsync';
import { listPackages } from '../../services/catalog';
import Button from '../ui/Button';
import Chip from '../ui/Chip';
import SectionHeading from '../ui/SectionHeading';
import { Reveal } from '../ui/Reveal';
import PackageCard from '../travel/PackageCard';
import PackageCardSkeleton from '../travel/PackageCardSkeleton';

const MAX_CARDS = 6;

export default function HandpickedExperiences() {
  const [category, setCategory] = useState('');
  const { data, error, stale, reload } = useAsync(
    () => listPackages(category ? { category } : { featured: true }, { limit: MAX_CARDS }),
    [category],
  );
  const visible = data?.items ?? [];
  const viewAllHref = category ? `/packages?category=${encodeURIComponent(category)}` : '/packages';

  let grid;
  if (error && !data) {
    grid = (
      <div className="text-center py-4">
        <p className="text-muted-hh">We couldn’t load these experiences right now.</p>
        <Button variant="outline" icon="arrow-clockwise" onClick={reload}>
          Try again
        </Button>
      </div>
    );
  } else if (!data) {
    grid = (
      <div className="row g-4" aria-busy="true" aria-label="Loading experiences">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="col-md-6 col-xl-4">
            <PackageCardSkeleton />
          </div>
        ))}
      </div>
    );
  } else {
    grid = (
      <motion.div layout className={`row g-4 packages-results ${stale ? 'is-stale' : ''}`}>
        <AnimatePresence mode="popLayout" initial={false}>
          {visible.map((pkg) => (
            <motion.div
              key={pkg.slug}
              layout
              className="col-md-6 col-xl-4"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              <PackageCard pkg={pkg} />
            </motion.div>
          ))}
        </AnimatePresence>
      </motion.div>
    );
  }

  return (
    <section className="section bg-sand" aria-labelledby="handpicked-title">
      <div className="container">
        <SectionHeading
          id="handpicked-title"
          eyebrow="Handpicked experiences"
          title="Holidays designed around how you travel"
          subtitle="Every package comes with a day-by-day plan, clear inclusions and an honest per-person price."
        />

        <Reveal className="chip-row" role="group" aria-label="Filter experiences by category">
          <Chip active={category === ''} onClick={() => setCategory('')} icon="stars">
            Featured
          </Chip>
          {categories.map((c) => (
            <Chip key={c} active={category === c} onClick={() => setCategory(c)}>
              {c}
            </Chip>
          ))}
        </Reveal>

        <p className="visually-hidden" aria-live="polite">
          {data ? `Showing ${visible.length} ${category || 'featured'} packages` : ''}
        </p>

        {grid}

        <div className="text-center mt-5">
          <Button to={viewAllHref} variant="ocean" size="lg" iconEnd="arrow-right">
            {category ? `View all ${category} packages` : 'View all packages'}
          </Button>
        </div>
      </div>
    </section>
  );
}
