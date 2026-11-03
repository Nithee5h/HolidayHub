import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform } from 'motion/react';
import { photos } from '../../data/images';
import Button from '../ui/Button';
import SmartImage from '../ui/SmartImage';
import SearchBar from '../travel/SearchBar';

const EASE = [0.22, 1, 0.36, 1];
const rise = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE } },
};

export default function Hero() {
  const sectionRef = useRef(null);
  const destinationRef = useRef(null);
  const reduceMotion = useReducedMotion();

  // Scroll-linked parallax via Motion (no React re-renders per frame).
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ['start start', 'end start'] });
  const imageY = useTransform(scrollYProgress, [0, 1], ['0%', '18%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.6], [1, 0]);

  const planTrip = () => {
    const input = destinationRef.current;
    if (!input) return;
    input.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'center' });
    input.focus({ preventScroll: true });
  };

  return (
    <section ref={sectionRef} className="hero" aria-labelledby="hero-title">
      <motion.div className="hero__media" style={reduceMotion ? undefined : { y: imageY }} aria-hidden="true">
        <SmartImage src={photos.heroBeach.url} alt="" eager width={1920} className="hero__img" />
      </motion.div>
      <div className="hero__overlay" aria-hidden="true" />

      <div className="container hero__inner">
        <motion.div
          className="hero__content"
          style={reduceMotion ? undefined : { opacity: contentOpacity }}
          initial="hidden"
          animate="visible"
          variants={{ visible: { transition: { staggerChildren: 0.12, delayChildren: 0.15 } } }}
        >
          <motion.p className="hero__eyebrow glass" variants={rise}>
            <i className="bi bi-stars" aria-hidden="true" /> Handpicked holidays across India &amp; the world
          </motion.p>
          <motion.h1 id="hero-title" className="hero__title font-display" variants={rise}>
            Your Next <em>Adventure</em> Begins Here.
          </motion.h1>
          <motion.p className="hero__subtitle" variants={rise}>
            Explore extraordinary destinations. Create unforgettable memories.
          </motion.p>
          <motion.div className="hero__ctas" variants={rise}>
            <Button to="/destinations" variant="primary" size="lg" iconEnd="arrow-right">
              Explore Destinations
            </Button>
            <Button variant="glass" size="lg" icon="compass" onClick={planTrip}>
              Plan Your Trip
            </Button>
          </motion.div>
        </motion.div>

        <motion.div
          className="hero__search"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.65, ease: EASE }}
        >
          <SearchBar destinationRef={destinationRef} />
        </motion.div>
      </div>

      <a href="#popular-destinations" className="hero__scroll-cue" aria-label="Scroll to popular destinations">
        <i className="bi bi-chevron-double-down" aria-hidden="true" />
      </a>
    </section>
  );
}
