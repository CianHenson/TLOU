// Airlines master list: feeds the Airfare Sales dropdowns. Sales store the airline NAME as text, so editing or deactivating an
// airline never changes existing sales. Server-only.
import 'server-only';
import { db } from '../db';
import { where } from '../list';
import { str } from '../util';

/** Active airline names, for the Airfare Sales form. */
export const activeAirlineNames = async () => (await db.all<{ name: string }>('SELECT name FROM airlines WHERE active=1 ORDER BY name')).map((r) => r.name);

export function airlineQuery(q: Record<string, string>): [string, unknown[]] {
  const w = where();
  if (q.q) { const l = `%${str(q.q, 60)}%`; w.add('(a.name LIKE ? OR a.code LIKE ?)', l, l); }
  if (q.status === 'active') w.add('a.active=1'); else if (q.status === 'inactive') w.add('a.active=0');
  return [`SELECT a.*, (SELECT COUNT(*) FROM airfare_sales s WHERE s.airline=a.name) AS sales FROM airlines a ${w.sql} ORDER BY a.active DESC, a.name`, w.p];
}

export function airlineInput(b: Record<string, FormDataEntryValue | undefined>) {
  const a = { name: str(b.name, 80), code: str(b.code, 8).toUpperCase(), active: b.active === 'on' || b.active === '1' ? 1 : 0 };
  const errors: Record<string, string> = {};
  if (a.name.length < 2) errors.name = 'Enter the airline name (at least 2 characters).';
  else if (!/^[\p{L}\p{N}][\p{L}\p{N} .,&()'-]*$/u.test(a.name)) errors.name = 'Use letters, numbers and basic punctuation only.';
  if (a.code && !/^[A-Z0-9]{2,3}$/.test(a.code)) errors.code = '2–3 letters or numbers, e.g. PR or 5J.';
  return { a, errors };
}
