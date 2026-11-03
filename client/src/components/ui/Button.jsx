import { Link } from 'react-router';
import './Button.css';

/**
 * Design-system button. Renders a router <Link> when `to` is set, an <a> for
 * `href`, otherwise a native <button>.
 *
 * variant: primary | teal | ocean | glass | outline | outline-light | ghost
 * size:    sm | md | lg
 */
export default function Button({
  variant = 'primary',
  size = 'md',
  to,
  href,
  icon,
  iconEnd,
  block = false,
  className = '',
  children,
  type = 'button',
  ...rest
}) {
  const classes = ['hh-btn', `hh-btn--${variant}`, `hh-btn--${size}`, block && 'hh-btn--block', className]
    .filter(Boolean)
    .join(' ');

  const content = (
    <>
      {icon && <i className={`bi bi-${icon}`} aria-hidden="true" />}
      {children && <span>{children}</span>}
      {iconEnd && <i className={`bi bi-${iconEnd} hh-btn__icon-end`} aria-hidden="true" />}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} {...rest}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a href={href} className={classes} {...rest}>
        {content}
      </a>
    );
  }
  return (
    <button type={type} className={classes} {...rest}>
      {content}
    </button>
  );
}
