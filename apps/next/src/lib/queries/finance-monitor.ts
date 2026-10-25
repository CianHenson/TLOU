// "Trip&Ride Travel Services Monitoring Finances": valid expenses pivoted into the client's sheet columns,
// one row per day (or month), plus a Total Cost column and a totals row. Server-only.
// Expenses saved under categories from before the client's list are counted as Miscellaneous.
import 'server-only';
import { db } from '../db';
import { where } from '../list';
import { EXPENSE_CATS } from '../types';
import { isDate, monthRange, str, today } from '../util';

export type FinanceRow = { key: string; cats: number[]; total: number };

/**
 * Period and filters from the URL. No dates = this month; `range=all` = everything up to today.
 * `rows` = one row per day (default) or month; `q` searches descriptions; `category` limits to one sheet column.
 */
export function financeRange(q: Record<string, string>) {
  const [mFrom, mTo] = monthRange(today().slice(0, 7));
  const all = q.range === 'all';
  const from = isDate(q.from) ? q.from : all ? '2000-01-01' : mFrom, to = isDate(q.to) ? q.to : all ? today() : mTo;
  return {
    from, to, rows: q.rows === 'month' ? 'month' as const : 'day' as const,
    range: all ? 'all' : q.range || (isDate(q.from) || isDate(q.to) ? 'custom' : 'month'),
    search: str(q.q, 60), category: EXPENSE_CATS.includes(q.category) ? q.category : '',
  };
}

export async function financeSheet(f: ReturnType<typeof financeRange>) {
  const len = f.rows === 'month' ? 7 : 10;
  const w = where();
  w.add(`status='Valid'`);
  w.add('spent_at BETWEEN ? AND ?', f.from, f.to);
  if (f.search) w.add('description LIKE ?', `%${f.search}%`);
  // Miscellaneous also holds the older, pre-client categories.
  if (f.category === 'Miscellaneous') w.add(`category NOT IN (${EXPENSE_CATS.slice(0, -1).map(() => '?').join(',')})`, ...EXPENSE_CATS.slice(0, -1));
  else if (f.category) w.add('category=?', f.category);
  const data = await db.all(`SELECT SUBSTR(spent_at,1,${len}) AS k, category, SUM(amount) AS amt FROM expenses ${w.sql} GROUP BY k, category ORDER BY k`, w.p);
  const misc = EXPENSE_CATS.length - 1;
  const byKey = new Map<string, FinanceRow>();
  for (const r of data) {
    const row = byKey.get(r.k) ?? { key: r.k, cats: EXPENSE_CATS.map(() => 0), total: 0 };
    const i = EXPENSE_CATS.indexOf(r.category);
    row.cats[i < 0 ? misc : i] += Number(r.amt);
    row.total += Number(r.amt);
    byKey.set(r.k, row);
  }
  const rows = [...byKey.values()];
  const totals = { key: 'Total', cats: EXPENSE_CATS.map((_, i) => rows.reduce((s, r) => s + r.cats[i], 0)), total: rows.reduce((s, r) => s + r.total, 0) };
  return { rows, totals };
}
