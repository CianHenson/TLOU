import { useState } from 'react';
import { ApiError } from './api';

/**
 * Small form state helper: values, per-field server errors, and `bind(name)` to spread into <Field>.
 *   const f = useForm({ name: '' });  <Field label="Name" {...f.bind('name')} />
 *   try { await post(...) } catch (e) { f.fail(e) }   // 422 -> field errors
 */
export function useForm<T extends Record<string, unknown>>(initial: T) {
  const [v, setV] = useState<T>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  const bind = (name: keyof T & string) => ({
    name,
    value: (v[name] as string | number | undefined) ?? '',
    onChange: (val: string) => setV((p) => ({ ...p, [name]: val })),
    error: errors[name],
  });
  /** Apply a failed request: field errors for 422, a top message otherwise. */
  const fail = (e: unknown) => {
    if (e instanceof ApiError) {
      setErrors(e.errors);
      setMessage(e.message);
    } else {
      setErrors({});
      setMessage('Something went wrong. Please try again.');
    }
  };
  const reset = () => { setErrors({}); setMessage(''); };
  return { v, setV, errors, setErrors, message, setMessage, bind, fail, reset };
}
