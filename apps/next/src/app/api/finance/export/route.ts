import { api, csv } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { finance } from '@/lib/biz';
import { plain } from '@/lib/util';
import { flat } from '@/lib/list';
import { period } from '@/lib/queries/owner';

export const GET = api(async (req) => {
  await apiUser('owner');
  const per = period(flat(Object.fromEntries(req.nextUrl.searchParams)));
  const f = await finance(per.from, per.to);
  const rows = [['Booking sales (excl. cancelled)', plain(f.booking_sales)], ['Quoted', plain(f.quoted)], ['Confirmed booking value', plain(f.confirmed)], ['Completed value', plain(f.completed)],
    ['Cancelled value', plain(f.cancelled)], ['Payments received', plain(f.received)], ['Refunds', plain(f.refunds)], ['Net collected', plain(f.collected)],
    ['Supplier costs', plain(f.supplier_costs)], ['Service fees', plain(f.fees)], ['Gross booking margin', plain(f.grossMargin)], ['Business expenses', plain(f.expenses)],
    ['Net operating result', plain(f.net)], ['Outstanding balances (as of today)', plain(f.outstanding)]];
  return csv(`financial-report-${per.from}_${per.to}`, ['Item', 'Amount (PHP)'], rows);
});
