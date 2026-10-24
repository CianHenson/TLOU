import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { METHODS } from '@/lib/biz';
import { flat, paginate } from '@/lib/list';
import { peso } from '@/lib/util';
import { Page, Pager, SortTh } from '@/components/ui';
import { PrintButton } from '@/components/widgets';
import { staffList } from '@/lib/queries/core';
import { paymentQuery } from '@/lib/queries/payments';

export const metadata = { title: 'Payments & Transactions' };

export default async function Payments(props: PageProps<'/app/payments'>) {
  await requireUser();
  const q = flat(await props.searchParams);
  const [sql, p] = paymentQuery(q);
  const [list, staff] = await Promise.all([paginate(q, sql, p), staffList()]);
  return (
    <Page title="Payments & Transactions">
      <form className="card filters" method="get" key={list.qs}>
        <div className="grow"><label htmlFor="q">Search</label><input id="q" name="q" defaultValue={q.q || ''} placeholder="Payment ID, customer, booking, reference" /></div>
        <div><label>Type</label><select name="kind" defaultValue={q.kind || ''}><option value="">All</option><option>Payment</option><option>Refund</option></select></div>
        <div><label>Record status</label><select name="pstatus" defaultValue={q.pstatus || ''}><option value="">All</option><option>Valid</option><option>Reversed</option></select></div>
        <div><label>Method</label><select name="method" defaultValue={q.method || ''}><option value="">All</option>{METHODS.map((m) => <option key={m}>{m}</option>)}</select></div>
        <div><label>Recorded by</label><select name="employee" defaultValue={q.employee || ''}><option value="">Anyone</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label>From</label><input type="date" name="from" defaultValue={q.from || ''} /></div>
        <div><label>To</label><input type="date" name="to" defaultValue={q.to || ''} /></div>
        <div className="btnrow"><button className="btn">Filter</button><Link className="btn ghost" href="/app/payments">Reset</Link>
          <a className="btn ghost" href={`/api/payments/export?${list.qs}`}>Export CSV</a><PrintButton className="btn ghost">PDF / Print</PrintButton></div>
      </form>
      <p className="muted small">Payments are recorded from each booking page. Amounts shown are individual transactions; refunds are negative.</p>
      <div className="tw"><table>
        <thead><tr><SortTh list={list} label="ID" k="ref" /><SortTh list={list} label="Date" k="date" /><th>Type</th><SortTh list={list} label="Customer" k="customer" /><th>Booking</th><th>Method</th><th>Reference</th><SortTh list={list} label="Amount" k="amount" cls="num" /><th>Recorded by</th></tr></thead>
        <tbody>
          {list.rows.map((r) => (
            <tr key={r.id} className={r.status === 'Reversed' ? 'off' : ''}><td>{r.ref}</td><td className="nowrap">{r.paid_at}</td><td>{r.kind}{r.status === 'Reversed' ? ' (reversed)' : ''}</td><td><Link href={`/app/customers/${r.customer_id}`}>{r.customer}</Link></td>
              <td><Link href={`/app/bookings/${r.booking_id}`}>{r.booking_ref}</Link></td><td>{r.method}</td><td>{r.reference}</td><td className="num">{r.kind === 'Refund' ? '−' : ''}{peso(r.amount)}</td><td>{r.recorder}</td></tr>
          ))}
          {!list.rows.length && <tr><td colSpan={9} className="empty">No transactions found.</td></tr>}
        </tbody></table></div>
      <Pager list={list} />
    </Page>
  );
}
