// "Trip&Ride Travel Services Monitoring Finances": the valid expenses in the chosen period, one row each
// (date, type of expense, description / remarks, amount). Server-only.
// Expenses saved under categories from before the client's list are counted as Miscellaneous.
import 'server-only';
import { db } from '../db';
import { where } from '../list';
import { EXPENSE_CATS } from '../types';
import { isDate, monthRange, str, today } from '../util';

export type FinanceRow = { id: number; date: string; type: string; description: string; amount: number; by: string; method: string; receipt: string; receiptName: string };

/**
 * Period and filters from the URL. No dates = this month; `range=all` = everything up to today.
 * `q` searches descriptions; `category` is a comma-separated list of expense types to keep.
 */
export function financeRange(q: Record<string, string>) {
  const [mFrom, mTo] = monthRange(today().slice(0, 7));
  const all = q.range === 'all';
  const from = isDate(q.from) ? q.from : all ? '2000-01-01' : mFrom, to = isDate(q.to) ? q.to : all ? today() : mTo;
  return {
    from, to,
    range: all ? 'all' : q.range || (isDate(q.from) || isDate(q.to) ? 'custom' : 'month'),
    search: str(q.q, 60), categories: (q.category || '').split(',').filter((c) => EXPENSE_CATS.includes(c)),
  };
}

export async function financeSheet(f: ReturnType<typeof financeRange>) {
  const w = where();
  w.add(`e.status='Valid'`);
  w.add('e.spent_at BETWEEN ? AND ?', f.from, f.to);
  if (f.search) w.add('e.description LIKE ?', `%${f.search}%`);
  // Miscellaneous also holds the older, pre-client categories.
  if (f.categories.length) {
    const named = EXPENSE_CATS.slice(0, -1), pick = f.categories.filter((c) => named.includes(c));
    const conds = [...(pick.length ? [`e.category IN (${pick.map(() => '?').join(',')})`] : []), ...(f.categories.includes('Miscellaneous') ? [`e.category NOT IN (${named.map(() => '?').join(',')})`] : [])];
    w.add(`(${conds.join(' OR ')})`, ...pick, ...(f.categories.includes('Miscellaneous') ? named : []));
  }
  const data = await db.all(`SELECT e.id, e.spent_at, e.category, e.description, e.amount, e.method, e.receipt, n.body AS receipt_name, u.name AS by_name FROM expenses e LEFT JOIN users u ON u.id=COALESCE(e.updated_by, e.user_id) LEFT JOIN notes n ON n.entity='expense_file' AND n.entity_id=e.id ${w.sql} ORDER BY e.spent_at, e.id`, w.p);
  const rows: FinanceRow[] = data.map((r: any) => ({
    id: r.id, date: r.spent_at, type: EXPENSE_CATS.includes(r.category) ? r.category : 'Miscellaneous',
    description: r.description || '', amount: Number(r.amount), by: r.by_name || '', method: r.method || '', receipt: r.receipt || '', receiptName: r.receipt_name || r.receipt || '',
  }));
  return { rows, total: rows.reduce((t, r) => t + r.amount, 0) };
}
