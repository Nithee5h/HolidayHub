import { useState } from 'react';
import TextField from './TextField';

/** Password input with an accessible show/hide toggle. */
export default function PasswordField(props) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      addon={
        <button
          type="button"
          className="hh-field__toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          aria-controls={props.id}
        >
          <i className={`bi bi-${visible ? 'eye-slash' : 'eye'}`} aria-hidden="true" />
        </button>
      }
    />
  );
}
