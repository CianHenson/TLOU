// Expenses: list query (page + CSV export), form validation and who may touch which record. Server-only.
//  * Owner / admin see and manage every expense; a staff member only ever sees and manages the ones they recorded.
import 'server-only';
import { db } from '../db';
import { where } from '../list';
import { EXPENSE_CATS, METHODS } from '../biz';
import { HttpError, isOwner, type SessionUser } from '../auth';
import { str, isDate, toCents, today, intOrNull } from '../util';

/** Comma-separated expense types from the URL (`category`). */
export const expenseCats = (q: Record<string, string>) => (q.category || '').split(',').filter((c) => EXPENSE_CATS.includes(c));

/**
 * Valid expenses matching the URL filters. Staff are always limited to their own (`user.id`), whatever the URL says;
 * the owner / admin can narrow to one recorder with `uid`.
 */
export function expenseQuery(q: Record<string, string>, user: SessionUser): [string, unknown[]] {
  const w = where();
  w.add(`e.status='Valid'`);
  if (!isOwner(user)) w.add('e.user_id=?', user.id);
  else if (intOrNull(q.uid)) w.add('e.user_id=?', intOrNull(q.uid));
  if (q.q) { const l = `%${str(q.q, 60)}%`; w.add('(e.description LIKE ? OR e.category LIKE ? OR e.method LIKE ?)', l, l, l); }
  const cats = expenseCats(q);
  if (cats.length) w.add(`e.category IN (${cats.map(() => '?').join(',')})`, ...cats);
  if (isDate(q.from)) w.add('e.spent_at>=?', q.from);
  if (isDate(q.to)) w.add('e.spent_at<=?', q.to);
  return [`SELECT e.*, n.body AS receipt_name, u.name AS recorder FROM expenses e LEFT JOIN users u ON u.id=e.user_id
    LEFT JOIN notes n ON n.entity='expense_file' AND n.entity_id=e.id ${w.sql} ORDER BY e.spent_at DESC, e.id DESC`, w.p];
}

/** Validated expense form values; `errors` is keyed by field name so the modal can highlight them. */
export function expenseInput(b: Record<string, FormDataEntryValue | undefined>) {
  const x = { spent_at: str(b.spent_at, 10) || today(), category: String(b.category ?? ''), method: String(b.method ?? ''), description: str(b.description, 500), amount: toCents(b.amount) };
  const errors: Record<string, string> = {};
  if (!isDate(x.spent_at) || x.spent_at > today()) errors.spent_at = 'Enter a valid date (not in the future).';
  if (!EXPENSE_CATS.includes(x.category)) errors.category = 'Choose a type of expense.';
  if (!METHODS.includes(x.method)) errors.method = 'Choose a payment method.';
  if (!Number.isFinite(x.amount) || x.amount <= 0) errors.amount = 'Enter an amount above 0.';
  else if (x.amount > 1e11) errors.amount = 'That amount is too large.';
  if (!x.description) errors.description = 'Add a description.';
  return { x, errors };
}

/** Loads a valid expense the user may change: owner / admin any, staff only their own (anything else looks like "not found"). */
export async function ownedExpense(user: SessionUser, id: unknown) {
  const e = /^\d+$/.test(String(id)) ? await db.get('SELECT * FROM expenses WHERE id=? AND status=?', [id, 'Valid']) : undefined;
  if (!e || (!isOwner(user) && e.user_id !== user.id)) throw new HttpError(404, 'Expense not found.');
  return e;
}

/** Valid expenses per month (pesos) for a list of 'YYYY-MM'. */
export async function expenseMonthly(months: string[]) {
  const rows = await db.all<{ m: string; total: number }>(`SELECT SUBSTR(spent_at,1,7) AS m, SUM(amount) AS total FROM expenses WHERE status='Valid' AND SUBSTR(spent_at,1,7) BETWEEN ? AND ? GROUP BY 1`, [months[0], months[months.length - 1]]);
  const by = new Map(rows.map((r) => [r.m, Number(r.total)]));
  return months.map((m) => (by.get(m) ?? 0) / 100);
}

/** Total of valid expenses between two days (centavos). */
export const expenseTotal = async (from: string, to: string) => Number((await db.val(`SELECT COALESCE(SUM(amount),0) FROM expenses WHERE status='Valid' AND spent_at BETWEEN ? AND ?`, [from, to])) ?? 0);
