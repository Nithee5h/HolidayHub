import './Skeleton.css';

/** Shimmering placeholder block. Pass width/height/radius via props or className. */
export default function Skeleton({ width = '100%', height = '1rem', radius, className = '' }) {
  return <span className={`hh-skeleton ${className}`} style={{ width, height, borderRadius: radius }} aria-hidden="true" />;
}
