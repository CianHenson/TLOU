// Expenses list query, shared by the page and the CSV export. Server-only.
import 'server-only';
import { where } from '../list';
import { EXPENSE_CATS } from '../biz';
import { str, isDate } from '../util';

export function expenseQuery(q: Record<string, string>): [string, unknown[]] {
  const w = where();
  if (q.q) { const l = `%${str(q.q, 60)}%`; w.add('(e.description LIKE ? OR e.category LIKE ?)', l, l); }
  if (EXPENSE_CATS.includes(q.category)) w.add('e.category=?', q.category);
  if (isDate(q.from)) w.add('e.spent_at>=?', q.from);
  if (isDate(q.to)) w.add('e.spent_at<=?', q.to);
  return [`SELECT e.*, u.name AS recorder FROM expenses e LEFT JOIN users u ON u.id=e.user_id ${w.sql} ORDER BY e.spent_at DESC, e.id DESC`, w.p];
}
