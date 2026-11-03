import { motion } from 'motion/react';
import SmartImage from '../ui/SmartImage';
import './PageHeader.css';

/** Banner for inner pages: title block over an optional photo with ocean scrim. */
export default function PageHeader({ eyebrow, title, subtitle, photo, overlap = false, children }) {
  return (
    <header className={`page-header ${photo ? 'page-header--photo' : ''} ${overlap ? 'page-header--overlap' : ''}`}>
      {photo && <SmartImage src={photo.url} alt="" eager width={1920} className="page-header__img" />}
      <div className="container page-header__inner">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          {eyebrow && <p className="page-header__eyebrow">{eyebrow}</p>}
          <h1 className="page-header__title font-display">{title}</h1>
          {subtitle && <p className="page-header__subtitle">{subtitle}</p>}
          {children}
        </motion.div>
      </div>
    </header>
  );
}
