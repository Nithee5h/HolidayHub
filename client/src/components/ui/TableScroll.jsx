/**
 * Horizontally scrollable table wrapper. Focusable and named so keyboard
 * users can scroll it (WCAG: scrollable regions must be keyboard accessible).
 */
export default function TableScroll({ label, className = '', children, ...rest }) {
  return (
    <div className={`table-responsive ${className}`} role="region" aria-label={label} tabIndex={0} {...rest}>
      {children}
    </div>
  );
}
