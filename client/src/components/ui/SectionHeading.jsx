import { Reveal } from './Reveal';
import './SectionHeading.css';

export default function SectionHeading({ eyebrow, title, subtitle, align = 'start', action, id, light = false }) {
  return (
    <Reveal className={`section-heading section-heading--${align} ${light ? 'section-heading--light' : ''}`}>
      <div className="section-heading__text">
        {eyebrow && <p className="section-heading__eyebrow">{eyebrow}</p>}
        <h2 id={id} className="section-heading__title font-display">
          {title}
        </h2>
        {subtitle && <p className="section-heading__subtitle">{subtitle}</p>}
      </div>
      {action && <div className="section-heading__action">{action}</div>}
    </Reveal>
  );
}
