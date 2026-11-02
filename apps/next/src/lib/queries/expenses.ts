// Expenses: list query (page + CSV export), form validation and who may touch which record. Server-only.
//  * Everyone with expense access sees every expense; the owner / admin manage any, a staff member only the ones they recorded.
import 'server-only';
import { db } from '../db';
import { orderBy, where } from '../list';
import { EXPENSE_CATS, METHODS } from '../biz';
import { HttpError, isOwner, type SessionUser } from '../auth';
import { str, isDate, toCents, today, intOrNull } from '../util';

/** Comma-separated expense types from the URL (`category`). */
export const expenseCats = (q: Record<string, string>) => [...new Set((q.category || '').split(',').map((c) => str(c, 40)).filter(Boolean))];

/** Every category in use: the standard list first, then the ones people added (alphabetical). */
export async function expenseCategories() {
  const used = await db.all<{ category: string }>(`SELECT DISTINCT category FROM expenses WHERE status='Valid' AND category<>''`);
  return [...EXPENSE_CATS, ...used.map((r) => r.category).filter((c) => !EXPENSE_CATS.includes(c)).sort((a, b) => a.localeCompare(b))];
}

/**
 * Valid expenses matching the URL filters (everyone with expense access sees every expense); `uid` narrows to one recorder.
 */
/** Right-click "Sort by" / "Group by" keys → SQL (the table offers the same keys). */
const SORTS = { date: 'e.spent_at', type: 'e.category', description: 'e.description', method: 'e.method', by: 'u.name', amount: 'e.amount' };
const GROUPS = { type: 'e.category ASC', method: 'e.method ASC', month: 'SUBSTR(e.spent_at,1,7) DESC', by: 'u.name ASC' };

export function expenseQuery(q: Record<string, string>, user: SessionUser): [string, unknown[]] {
  const w = where();
  w.add(`e.status='Valid'`);
  if (intOrNull(q.uid)) w.add('e.user_id=?', intOrNull(q.uid));
  if (q.q) { const l = `%${str(q.q, 60)}%`; w.add('(e.description LIKE ? OR e.category LIKE ? OR e.method LIKE ?)', l, l, l); }
  const cats = expenseCats(q);
  if (cats.length) w.add(`e.category IN (${cats.map(() => '?').join(',')})`, ...cats);
  if (isDate(q.from)) w.add('e.spent_at>=?', q.from);
  if (isDate(q.to)) w.add('e.spent_at<=?', q.to);
  return [`SELECT e.*, n.body AS receipt_name, u.name AS recorder FROM expenses e LEFT JOIN users u ON u.id=e.user_id
    LEFT JOIN notes n ON n.entity='expense_file' AND n.entity_id=e.id ${w.sql} ${orderBy(q, SORTS, GROUPS, 'e.spent_at DESC, e.id DESC', 'e.id DESC')}`, w.p];
}

/** Validated expense form values; `errors` is keyed by field name so the modal can highlight them. */
export function expenseInput(b: Record<string, FormDataEntryValue | undefined>) {
  // "Add new category…" / "Other" payment method send the typed text in category_new / method_other.
  const newCat = b.category === '__new', other = b.method === 'Other';
  const typedCat = str(newCat ? b.category_new : b.category, 40);
  const x = { spent_at: str(b.spent_at, 10) || today(), category: EXPENSE_CATS.find((c) => c.toLowerCase() === typedCat.toLowerCase()) ?? typedCat,
    method: other ? str(b.method_other, 30) : String(b.method ?? ''), description: str(b.description, 500), amount: toCents(b.amount) };
  const errors: Record<string, string> = {};
  if (!isDate(x.spent_at) || x.spent_at > today()) errors.spent_at = 'Enter a valid date (not in the future).';
  const catKey = newCat ? 'category_new' : 'category';
  if (!x.category) errors[catKey] = newCat ? 'Enter the new category name.' : 'Choose a type of expense.';
  else if (!/^[\p{L}\p{N}][\p{L}\p{N} &/.,()'-]*$/u.test(x.category)) errors[catKey] = 'Use letters, numbers and basic punctuation only.';
  if (other) { if (!x.method) errors.method_other = 'Say what the other payment method is.'; }
  else if (!METHODS.includes(x.method)) errors.method = 'Choose a payment method.';
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
