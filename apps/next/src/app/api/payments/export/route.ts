import { api, csv } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { flat } from '@/lib/list';
import { plain } from '@/lib/util';
import { paymentQuery } from '@/lib/queries/payments';

export const GET = api(async (req) => {
  await apiUser();
  const q = flat(Object.fromEntries(req.nextUrl.searchParams));
  const [sql, p] = paymentQuery(q);
  const rows = await db.all(sql, p);
  return csv('transactions', ['Payment ID', 'Date', 'Type', 'Status', 'Customer', 'Booking', 'Method', 'Reference', 'Amount', 'Recorded by', 'Remarks'],
    rows.map((r) => [r.ref, r.paid_at, r.kind, r.status, r.customer, r.booking_ref, r.method, r.reference, (r.kind === 'Refund' ? '-' : '') + plain(r.amount), r.recorder, r.remarks]));
});
