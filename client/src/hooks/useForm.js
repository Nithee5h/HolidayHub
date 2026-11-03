import { useCallback, useState } from 'react';

/**
 * Small form-state hook: values, per-field validation that kicks in after a
 * field is touched (then updates live), whole-form validation on submit and
 * mapping of server-side field errors.
 * `validate(values)` returns { field: message } for invalid fields.
 */
export function useForm(initialValues, validate) {
  const [values, setValues] = useState(initialValues);
  const [touched, setTouched] = useState({});
  const [serverErrors, setServerErrors] = useState({});

  const clientErrors = validate(values);
  const errors = Object.fromEntries(
    Object.keys(values)
      .map((k) => [k, serverErrors[k] ?? (touched[k] ? clientErrors[k] : undefined)])
      .filter(([, msg]) => msg),
  );

  const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    setValues((v) => ({ ...v, [name]: type === 'checkbox' ? checked : value }));
    setServerErrors((s) => (s[name] ? { ...s, [name]: undefined } : s));
  }, []);

  const handleBlur = useCallback((e) => setTouched((t) => ({ ...t, [e.target.name]: true })), []);

  /** Mark every field touched; returns the first invalid field name, if any. */
  const validateAll = () => {
    setTouched(Object.fromEntries(Object.keys(values).map((k) => [k, true])));
    return Object.keys(values).find((k) => clientErrors[k]);
  };

  /** Apply `[{ field, message }]` from an ApiError. */
  const applyServerErrors = (details = []) => setServerErrors(Object.fromEntries(details.map((d) => [d.field, d.message])));

  const reset = (next = initialValues) => {
    setValues(next);
    setTouched({});
    setServerErrors({});
  };

  return { values, errors, setValues, handleChange, handleBlur, validateAll, applyServerErrors, reset };
}

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const PHONE_RE = /^\+?[0-9\s-]{7,20}$/;
