import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { METHODS } from '@/lib/biz';
import { flat, paginate } from '@/lib/list';
import { peso } from '@/lib/util';
import { FootLine, Page, Pager, SortTh } from '@/components/ui';
import { ExportLink, PrintButton } from '@/components/widgets';
import { staffList } from '@/lib/queries/core';
import { paymentQuery } from '@/lib/queries/payments';
import { rowMenu } from '@/lib/menu';
import { RowMenus } from '@/components/context-menu';

export const metadata = { title: 'Payments & Transactions' };

export default async function Payments(props: PageProps<'/app/payments'>) {
  await requireUser();
  const q = flat(await props.searchParams);
  const [sql, p] = paymentQuery(q);
  const [list, staff] = await Promise.all([paginate(q, sql, p), staffList()]);
  const who = staff.find((s) => String(s.id) === q.employee)?.name;
  const active = [q.kind, q.pstatus, METHODS.includes(q.method) && q.method, who && `recorded by ${who}`, (q.from || q.to) && `dates ${q.from || 'start'} to ${q.to || 'today'}`, q.q && `search "${q.q}"`].filter(Boolean);
  const note = active.length ? `Filters are active (${active.join(', ')}). Only the filtered transactions will be exported.` : undefined;
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
          <ExportLink href={`/api/payments/export?${list.qs}`} note={note}>Export CSV</ExportLink><PrintButton className="btn ghost">PDF / Print</PrintButton></div>
      </form>
      <div className="tw-card"><RowMenus className="tw tw-fixed tw-fm"><table>
        <thead><tr><SortTh list={list} label="ID" k="ref" /><SortTh list={list} label="Date" k="date" /><th>Type</th><SortTh list={list} label="Customer" k="customer" /><th>Booking</th><th>Method</th><th>Reference</th><SortTh list={list} label="Amount" k="amount" cls="num" /><th>Recorded by</th></tr></thead>
        <tbody>
          {list.rows.map((r) => (
            <tr key={r.id} className={r.status === 'Reversed' ? 'off' : ''} {...rowMenu([{ label: 'Open booking', href: `/app/bookings/${r.booking_id}` }, { label: 'Open customer', href: `/app/customers/${r.customer_id}` }])}><td>{r.ref}</td><td className="nowrap">{r.paid_at}</td><td>{r.kind}{r.status === 'Reversed' ? ' (reversed)' : ''}</td><td><Link href={`/app/customers/${r.customer_id}`}>{r.customer}</Link></td>
              <td><Link href={`/app/bookings/${r.booking_id}`}>{r.booking_ref}</Link></td><td>{r.method}</td><td>{r.reference}</td><td className="num">{r.kind === 'Refund' ? '−' : ''}{peso(r.amount)}</td><td>{r.recorder}</td></tr>
          ))}
          {!list.rows.length && <tr><td colSpan={9} className="empty">No transactions found.</td></tr>}
          {!!list.rows.length && <tr className="fill"><td colSpan={9} /></tr>}
        </tbody>
        {!!list.rows.length && <FootLine cols={9} total={list.total} />}
        </table></RowMenus>
        {list.pages > 1 && <div className="tw-foot"><Pager list={list} /></div>}</div>
    </Page>
  );
}
