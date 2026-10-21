import { validDate } from '../common/util';

/** Case-insensitive "contains" over several fields, like the original SQL LIKE '%q%'. */
export const like = (fields: (string | null | undefined)[], q: string) => {
  const n = q.toLowerCase();
  return fields.some((f) => (f ?? '').toLowerCase().includes(n));
};

/** from/to query filters (inclusive) applied to the date part of a timestamp or date. */
export const inRange = (ts: string, q: Record<string, unknown>) => {
  const d = ts.slice(0, 10);
  if (validDate(q.from) && d < String(q.from)) return false;
  if (validDate(q.to) && d > String(q.to)) return false;
  return true;
};

export const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
