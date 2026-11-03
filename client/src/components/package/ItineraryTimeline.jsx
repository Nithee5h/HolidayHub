import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import './ItineraryTimeline.css';

const EASE = [0.22, 1, 0.36, 1];

/** Day-wise itinerary as a vertical timeline of accessible, animated accordions. */
export default function ItineraryTimeline({ itinerary }) {
  const uid = useId();
  const [open, setOpen] = useState(() => new Set(itinerary.length ? [itinerary[0].day] : []));
  const allOpen = open.size === itinerary.length;

  const toggle = (day) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });

  return (
    <div className="itinerary">
      <div className="itinerary__toolbar">
        <button
          type="button"
          className="itinerary__toggle-all"
          onClick={() => setOpen(allOpen ? new Set() : new Set(itinerary.map((d) => d.day)))}
        >
          <i className={`bi bi-arrows-${allOpen ? 'collapse' : 'expand'}`} aria-hidden="true" />
          {allOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>

      <ol className="itinerary__list">
        {itinerary.map((d) => {
          const isOpen = open.has(d.day);
          const panelId = `${uid}-day-${d.day}`;
          return (
            <li key={d.day} className={`itinerary__item ${isOpen ? 'is-open' : ''}`}>
              <span className="itinerary__node" aria-hidden="true" />
              <h3 className="itinerary__heading">
                <button type="button" className="itinerary__trigger" aria-expanded={isOpen} aria-controls={panelId} onClick={() => toggle(d.day)}>
                  <span className="itinerary__day">
                    Day {d.day}
                    <span className="visually-hidden">: </span>
                  </span>
                  <span className="itinerary__title">{d.title}</span>
                  <i className="bi bi-chevron-down itinerary__chevron" aria-hidden="true" />
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={panelId}
                    role="region"
                    aria-label={`Day ${d.day}: ${d.title}`}
                    className="itinerary__panel"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: EASE }}
                  >
                    <div className="itinerary__content">
                      <p>{d.description}</p>
                      {d.activities?.length > 0 && (
                        <ul className="itinerary__activities" aria-label="Activities">
                          {d.activities.map((a) => (
                            <li key={a}>
                              <i className="bi bi-star-fill" aria-hidden="true" /> {a}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
