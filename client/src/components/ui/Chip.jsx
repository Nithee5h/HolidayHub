import './Chip.css';

/** Toggleable filter chip (aria-pressed) or static tag when `onClick` is omitted. */
export default function Chip({ active = false, onClick, icon, children, className = '', ...rest }) {
  if (!onClick) {
    return (
      <span className={`hh-chip hh-chip--static ${className}`} {...rest}>
        {icon && <i className={`bi bi-${icon}`} aria-hidden="true" />}
        {children}
      </span>
    );
  }
  return (
    <button type="button" className={`hh-chip ${active ? 'is-active' : ''} ${className}`} aria-pressed={active} onClick={onClick} {...rest}>
      {icon && <i className={`bi bi-${icon}`} aria-hidden="true" />}
      {children}
    </button>
  );
}
