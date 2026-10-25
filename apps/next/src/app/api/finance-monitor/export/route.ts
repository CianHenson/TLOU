import { api, csv } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { EXPENSE_CATS } from '@/lib/biz';
import { flat } from '@/lib/list';
import { plain } from '@/lib/util';
import { financeRange, financeSheet } from '@/lib/queries/finance-monitor';

export const GET = api(async (req) => {
  await apiUser('owner');
  const f = financeRange(flat(Object.fromEntries(req.nextUrl.searchParams)));
  const { rows, totals } = await financeSheet(f);
  return csv(`monitoring-finances-${f.from}-to-${f.to}`, [f.rows === 'month' ? 'Month' : 'Date', ...EXPENSE_CATS.map((c) => `${c} Expenses`), 'Total Cost'],
    [...rows, totals].map((r) => [r.key, ...r.cats.map(plain), plain(r.total)]));
});
