// Airlines master list: feeds the Airfare Sales dropdowns. Sales store the airline NAME as text, so editing or deactivating an
// airline never changes existing sales. Server-only.
import 'server-only';
import { db } from '../db';
import { orderBy, where } from '../list';
import { str } from '../util';

/** Active airline names, for the Airfare Sales form. */
export const activeAirlineNames = async () => (await db.all<{ name: string }>('SELECT name FROM airlines WHERE active=1 ORDER BY name')).map((r) => r.name);

/** Right-click "Sort by" / "Group by" keys → SQL (the table offers the same keys). */
const SORTS = { name: 'a.name', status: 'a.active', sales: 'sales', updated: 'COALESCE(a.updated_at, a.created_at)' };
const GROUPS = { status: 'a.active DESC' };

export function airlineQuery(q: Record<string, string>): [string, unknown[]] {
  const w = where();
  if (q.q) w.add('a.name LIKE ?', `%${str(q.q, 60)}%`);
  if (q.status === 'active') w.add('a.active=1'); else if (q.status === 'inactive') w.add('a.active=0');
  return [`SELECT a.*, (SELECT COUNT(*) FROM airfare_sales s WHERE s.airline=a.name) AS sales FROM airlines a ${w.sql} ${orderBy(q, SORTS, GROUPS, 'a.active DESC, a.name', 'a.name')}`, w.p];
}

export function airlineInput(b: Record<string, FormDataEntryValue | undefined>) {
  const a = { name: str(b.name, 80), active: b.active === 'on' || b.active === '1' ? 1 : 0 };
  const errors: Record<string, string> = {};
  if (a.name.length < 2) errors.name = 'Enter the airline name (at least 2 characters).';
  else if (!/^[\p{L}\p{N}][\p{L}\p{N} .,&()'-]*$/u.test(a.name)) errors.name = 'Use letters, numbers and basic punctuation only.';
  return { a, errors };
}
