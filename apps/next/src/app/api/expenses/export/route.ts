import { api, csv } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { flat } from '@/lib/list';
import { plain } from '@/lib/util';
import { expenseQuery } from '@/lib/queries/expenses';

export const GET = api(async (req) => {
  const user = await apiUser('expenses');
  const q = flat(Object.fromEntries(req.nextUrl.searchParams));
  const [sql, p] = expenseQuery(q, user); // staff only ever export their own
  const rows = await db.all(sql, p);
  return csv('expenses', ['ID', 'Date', 'Type of expense', 'Amount', 'Payment method', 'Description', 'Recorded by'],
    rows.map((r) => [r.id, r.spent_at, r.category, plain(r.amount), r.method, r.description, r.recorder]));
});
