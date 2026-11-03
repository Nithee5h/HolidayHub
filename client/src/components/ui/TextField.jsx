import './TextField.css';

/**
 * Labelled input/textarea with hint and accessible error wiring.
 * Extra props go to the control; `addon` renders inside the control row.
 */
export default function TextField({ id, label, error, hint, as: Control = 'input', addon, className = '', ...controlProps }) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(' ') || undefined;
  return (
    <div className={`hh-field ${className}`}>
      <label htmlFor={id} className="form-label">
        {label}
      </label>
      <div className={`hh-field__control ${addon ? 'has-addon' : ''}`}>
        <Control
          id={id}
          className={`form-control ${error ? 'is-invalid' : ''}`}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          {...controlProps}
        />
        {addon}
      </div>
      {hint && (
        <div id={`${id}-hint`} className="form-text">
          {hint}
        </div>
      )}
      {error && (
        <div id={`${id}-error`} className="hh-field__error">
          <i className="bi bi-exclamation-circle" aria-hidden="true" /> {error}
        </div>
      )}
    </div>
  );
}
