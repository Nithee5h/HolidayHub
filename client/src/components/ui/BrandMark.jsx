import { useId } from 'react';

/**
 * HolidayHub logo mark: a destination pin framing a sunrise over the sea, on a
 * Sunset Coral tile. Gradient ids are unique per instance because the mark can
 * appear several times on one page (navbar, drawer, footer).
 * Keep in sync with public/favicon.svg.
 */
export default function BrandMark({ size = 36, title }) {
  const id = useId().replace(/:/g, '');
  const tile = `${id}-tile`;
  const pin = `${id}-pin`;
  const sun = `${id}-sun`;
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} role={title ? 'img' : undefined} aria-label={title} aria-hidden={title ? undefined : true}>
      <defs>
        <linearGradient id={tile} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF9A76" />
          <stop offset="1" stopColor="#F0563A" />
        </linearGradient>
        <linearGradient id={pin} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#18467A" />
          <stop offset="1" stopColor="#0B2545" />
        </linearGradient>
        <linearGradient id={sun} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFD58F" />
          <stop offset="1" stopColor="#FFA45E" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="16" fill={`url(#${tile})`} />
      <path d="M32 6.5C20.4 6.5 11.5 15.4 11.5 27 11.5 41.6 32 58 32 58S52.5 41.6 52.5 27C52.5 15.4 43.6 6.5 32 6.5Z" fill={`url(#${pin})`} />
      <circle cx="32" cy="22.5" r="7.5" fill={`url(#${sun})`} />
      <path d="M19.5 32c4.2-2.8 8.3-2.8 12.5 0s8.3 2.8 12.5 0" fill="none" stroke="#00BFA6" strokeWidth="3.6" strokeLinecap="round" />
      <path d="M22.5 39c3.2-2.2 6.3-2.2 9.5 0s6.3 2.2 9.5 0" fill="none" stroke="#00BFA6" strokeOpacity=".7" strokeWidth="3.2" strokeLinecap="round" />
      <path d="M17.5 19.5a15.5 15.5 0 0 1 7.5-7.6" fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="2.4" strokeLinecap="round" />
    </svg>
  );
}
