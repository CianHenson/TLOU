import { api, csv } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { flat } from '@/lib/list';
import { plain } from '@/lib/util';
import { expenseQuery } from '@/lib/queries/expenses';

export const GET = api(async (req) => {
  await apiUser('expenses');
  const q = flat(Object.fromEntries(req.nextUrl.searchParams));
  const [sql, p] = expenseQuery(q);
  const rows = await db.all(sql, p);
  return csv('expenses', ['ID', 'Date', 'Category', 'Amount', 'Method', 'Description', 'Status', 'Recorded by'],
    rows.map((r) => [r.id, r.spent_at, r.category, plain(r.amount), r.method, r.description, r.status, r.recorder]));
});
