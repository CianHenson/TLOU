// Transactions list query, shared by the page and the CSV export. Server-only.
import 'server-only';
import { db } from '../db';
import { where, sortClause } from '../list';
import { METHODS, bookingSelect, decorate } from '../biz';
import { str, intOrNull, isDate } from '../util';

export function paymentQuery(q: Record<string, string>): [string, unknown[]] {
  const w = where();
  if (q.q) { const l = `%${str(q.q, 60)}%`; w.add('(p.ref LIKE ? OR c.name LIKE ? OR b.ref LIKE ? OR p.reference LIKE ?)', l, l, l, l); }
  if (['Payment', 'Refund'].includes(q.kind)) w.add('p.kind=?', q.kind);
  if (['Valid', 'Reversed'].includes(q.pstatus)) w.add('p.status=?', q.pstatus);
  if (METHODS.includes(q.method)) w.add('p.method=?', q.method);
  if (intOrNull(q.employee)) w.add('p.user_id=?', Number(q.employee));
  if (intOrNull(q.customer)) w.add('p.customer_id=?', Number(q.customer));
  if (isDate(q.from)) w.add('p.paid_at>=?', q.from);
  if (isDate(q.to)) w.add('p.paid_at<=?', q.to);
  const sort = sortClause({ date: 'p.paid_at', amount: 'p.amount', customer: 'c.name', ref: 'p.ref' }, 'date', q);
  return [`SELECT p.*, c.name AS customer, b.ref AS booking_ref, u.name AS recorder FROM payments p JOIN customers c ON c.id=p.customer_id
    JOIN bookings b ON b.id=p.booking_id LEFT JOIN users u ON u.id=p.user_id ${w.sql} ${sort}`, w.p];
}

/** Totals for the filtered list (reversed records are listed but never counted): payments received, refunds paid out, net. */
export const paymentTotals = async (sql: string, p: unknown[]) => (await db.get(`SELECT COUNT(*) AS n,
    COALESCE(SUM(CASE WHEN x.status='Valid' AND x.kind='Payment' THEN x.amount END),0) AS received,
    COALESCE(SUM(CASE WHEN x.status='Valid' AND x.kind='Refund' THEN x.amount END),0) AS refunds,
    COUNT(CASE WHEN x.status='Reversed' THEN 1 END) AS reversed FROM (${sql}) AS x`, p))!;

/** Bookings a payment can be recorded against (newest first), with what is still owed. */
export async function payableBookings() {
  const rows = (await db.all(`${bookingSelect} ORDER BY b.id DESC LIMIT 300`)).map(decorate);
  return rows.map((b) => ({ id: b.id as number, ref: b.ref as string, customer: b.customer as string, status: b.status as string, balance: b.balance as number, paid: b.paid as number }));
}
