import { useState } from 'react';
import { imageSrcSet, sizedImageUrl } from '../../data/images';
import './SmartImage.css';

/**
 * Responsive, lazy-loaded image with a shimmer placeholder, fade-in on load
 * and a branded gradient fallback if the source fails.
 * The wrapper fills its parent; size the parent (aspect-ratio / height).
 */
export default function SmartImage({ src, alt, sizes = '100vw', width = 1200, eager = false, className = '', imgClassName = '' }) {
  const [status, setStatus] = useState(src ? 'loading' : 'error');

  return (
    <div className={`smart-img smart-img--${status} ${className}`}>
      {status !== 'error' ? (
        <img
          src={sizedImageUrl(src, width)}
          srcSet={imageSrcSet(src)}
          sizes={sizes}
          alt={alt}
          loading={eager ? 'eager' : 'lazy'}
          fetchPriority={eager ? 'high' : undefined}
          decoding="async"
          className={imgClassName}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      ) : (
        <div className="smart-img__fallback" role="img" aria-label={alt || 'Image unavailable'}>
          <i className="bi bi-image" aria-hidden="true" />
        </div>
      )}
    </div>
  );
}
