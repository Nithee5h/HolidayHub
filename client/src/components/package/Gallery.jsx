import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import SmartImage from '../ui/SmartImage';
import './Gallery.css';

const SWIPE_THRESHOLD = 60;

/** Photo gallery: crossfading stage, prev/next, swipe, arrow keys and thumbnails. */
export default function Gallery({ images, title }) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const count = images.length;

  if (count === 0) {
    return (
      <div className="gallery">
        <div className="gallery__stage">
          <SmartImage src="" alt={`${title} — photo unavailable`} />
        </div>
      </div>
    );
  }

  const go = (next) => {
    setDirection(next > index || (index === count - 1 && next === 0) ? 1 : -1);
    setIndex((next + count) % count);
  };
  const current = images[index];

  return (
    <section
      className="gallery"
      aria-roledescription="carousel"
      aria-label={`${title} photos`}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') go(index + 1);
        if (e.key === 'ArrowLeft') go(index - 1);
      }}
    >
      <div className="gallery__stage">
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={current.url}
            className="gallery__slide"
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            drag={count > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_THRESHOLD) go(index + 1);
              else if (info.offset.x > SWIPE_THRESHOLD) go(index - 1);
            }}
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${count}`}
          >
            <SmartImage src={current.url} alt={current.alt} eager={index === 0} sizes="(min-width: 992px) 66vw, 100vw" width={1400} />
          </motion.div>
        </AnimatePresence>

        {count > 1 && (
          <>
            <button type="button" className="gallery__nav gallery__nav--prev" onClick={() => go(index - 1)} aria-label="Previous photo">
              <i className="bi bi-chevron-left" aria-hidden="true" />
            </button>
            <button type="button" className="gallery__nav gallery__nav--next" onClick={() => go(index + 1)} aria-label="Next photo">
              <i className="bi bi-chevron-right" aria-hidden="true" />
            </button>
            <span className="gallery__counter" aria-live="polite">
              {index + 1} / {count}
            </span>
          </>
        )}
      </div>

      {count > 1 && (
        <div className="gallery__thumbs">
          {images.map((img, i) => (
            <button
              key={img.url}
              type="button"
              className={`gallery__thumb ${i === index ? 'is-active' : ''}`}
              onClick={() => go(i)}
              aria-label={`Show photo ${i + 1}: ${img.alt}`}
              aria-current={i === index ? 'true' : undefined}
            >
              <SmartImage src={img.url} alt="" sizes="160px" width={320} />
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
