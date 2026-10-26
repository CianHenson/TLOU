import { api, csv } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { flat } from '@/lib/list';
import { plain } from '@/lib/util';
import { financeRange, financeSheet } from '@/lib/queries/finance-monitor';

export const GET = api(async (req) => {
  await apiUser('owner');
  const f = financeRange(flat(Object.fromEntries(req.nextUrl.searchParams)));
  const { rows } = await financeSheet(f);
  return csv(`monitoring-finances-${f.from}-to-${f.to}`, ['Date', 'Type of Expense', 'Description / Remarks', 'Payment Method', 'Modified By', 'Amount'],
    rows.map((r) => [r.date, r.type, r.description, r.method, r.by, plain(r.amount)]));
});
