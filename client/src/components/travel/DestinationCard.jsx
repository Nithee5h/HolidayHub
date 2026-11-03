import { Link } from 'react-router';
import SmartImage from '../ui/SmartImage';
import { formatPrice } from '../../utils/format';
import './DestinationCard.css';

/** Editorial photo card linking to packages for one destination. */
export default function DestinationCard({ destination, packageCount = 0, startingPrice, size = 'md', sizes = '(min-width: 992px) 25vw, 50vw' }) {
  const { name, country, tagline, photo } = destination;

  return (
    <Link to={`/packages?destination=${encodeURIComponent(name)}`} className={`dest-card dest-card--${size}`}>
      <SmartImage src={photo.url} alt={photo.alt} sizes={sizes} width={size === 'lg' ? 1400 : 900} className="dest-card__img" />
      <div className="dest-card__scrim" aria-hidden="true" />
      <div className="dest-card__body">
        <p className="dest-card__country">
          <i className="bi bi-geo-alt-fill" aria-hidden="true" /> {country}
        </p>
        <h3 className="dest-card__name font-display">{name}</h3>
        <p className="dest-card__tagline">{tagline}</p>
        <p className="dest-card__meta">
          {packageCount > 0 ? (
            <>
              {packageCount} {packageCount === 1 ? 'package' : 'packages'} · from {formatPrice(startingPrice)}
            </>
          ) : (
            'Browse packages'
          )}
          <i className="bi bi-arrow-up-right" aria-hidden="true" />
        </p>
      </div>
    </Link>
  );
}
