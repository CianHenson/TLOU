import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { BOOKING_STATUSES, SERVICE_TYPES, bookingSelect, decorate } from '@/lib/biz';
import { flat, paginate, sortClause, where } from '@/lib/list';
import { peso, str, intOrNull, isDate } from '@/lib/util';
import { FootLine, Page, Pager, SortTh } from '@/components/ui';
import { staffList, BK_BADGE, PAY_BADGE } from '@/lib/queries/core';
import { rowMenu } from '@/lib/menu';
import { RowMenus } from '@/components/context-menu';

export const metadata = { title: 'Bookings' };

export default async function Bookings(props: PageProps<'/app/bookings'>) {
  await requireUser();
  const q = flat(await props.searchParams);
  const w = where();
  if (q.q) { const l = `%${str(q.q, 60)}%`; w.add('(b.ref LIKE ? OR c.name LIKE ? OR b.supplier LIKE ? OR b.confirmation_ref LIKE ?)', l, l, l, l); }
  if (BOOKING_STATUSES.includes(q.status)) w.add('b.status=?', q.status);
  if (SERVICE_TYPES.includes(q.service)) w.add('b.service_type=?', q.service);
  if (intOrNull(q.employee)) w.add('b.assigned_to=?', Number(q.employee));
  if (intOrNull(q.customer)) w.add('b.customer_id=?', Number(q.customer));
  if (isDate(q.from)) w.add('SUBSTR(b.created_at,1,10)>=?', q.from);
  if (isDate(q.to)) w.add('SUBSTR(b.created_at,1,10)<=?', q.to);
  const having = ({ Unpaid: 'paid<=0', 'Partially Paid': 'paid>0 AND paid<tot', Paid: 'paid=tot', Overpaid: 'paid>tot' } as Record<string, string>)[q.pay];
  const sort = sortClause({ date: 'created_at', ref: 'ref', customer: 'customer', total: 'tot', status: 'status' }, 'date', q);
  const base = `SELECT * FROM (${bookingSelect} ${w.sql}) y`;
  const full = `SELECT * FROM (SELECT y.*, (selling_price+service_fee-discount) AS tot FROM (${base}) y) t ${having ? 'WHERE ' + having : ''} ${sort}`;
  const [list, staff] = await Promise.all([paginate(q, full, w.p), staffList()]);
  list.rows.forEach(decorate);
  return (
    <Page title="Bookings">
      <form className="card filters" method="get" key={list.qs}>
        <div className="grow"><label htmlFor="q">Search</label><input id="q" name="q" defaultValue={q.q || ''} placeholder="Booking ref, customer, supplier, ticket ref" /></div>
        <div><label>Status</label><select name="status" defaultValue={q.status || ''}><option value="">All</option>{BOOKING_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label>Payment</label><select name="pay" defaultValue={q.pay || ''}><option value="">All</option>{['Unpaid', 'Partially Paid', 'Paid', 'Overpaid'].map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label>Service</label><select name="service" defaultValue={q.service || ''}><option value="">All</option>{SERVICE_TYPES.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label>Employee</label><select name="employee" defaultValue={q.employee || ''}><option value="">Anyone</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label>From</label><input type="date" name="from" defaultValue={q.from || ''} /></div>
        <div><label>To</label><input type="date" name="to" defaultValue={q.to || ''} /></div>
        <div className="btnrow"><button className="btn">Filter</button><Link className="btn ghost" href="/app/bookings">Reset</Link><Link className="btn alt" href="/app/bookings/new">+ New booking</Link></div>
      </form>
      <div className="tw-card"><RowMenus className="tw tw-fixed tw-fm" empty={[{ label: 'New booking', href: '/app/bookings/new' }]}><table>
        <thead><tr><SortTh list={list} label="Booking" k="ref" /><SortTh list={list} label="Customer" k="customer" /><th>Service</th><SortTh list={list} label="Status" k="status" /><SortTh list={list} label="Total" k="total" cls="num" /><th className="num">Paid</th><th className="num">Balance</th><th>Payment</th><th>Employee</th><SortTh list={list} label="Date" k="date" /></tr></thead>
        <tbody>
          {list.rows.map((b) => (
            <tr key={b.id} className={b.status === 'Cancelled' ? 'off' : ''} {...rowMenu([{ label: 'Open booking', href: `/app/bookings/${b.id}` },
              b.status !== 'Cancelled' && { label: 'Edit booking', href: `/app/bookings/${b.id}/edit` }, { label: 'Open customer', href: `/app/customers/${b.customer_id}` }])}>
              <td><Link href={`/app/bookings/${b.id}`}>{b.ref}</Link></td><td><Link href={`/app/customers/${b.customer_id}`}>{b.customer}</Link></td><td>{b.service_type}</td>
              <td><span className={`badge ${BK_BADGE[b.status] ?? ''}`}>{b.status}</span></td>
              <td className="num">{peso(b.total)}</td><td className="num">{peso(b.paid)}</td><td className="num">{peso(b.balance)}</td>
              <td><span className={`badge ${PAY_BADGE[b.pay_status] ?? ''}`}>{b.pay_status}</span></td><td>{b.employee || '—'}</td><td className="nowrap">{b.created_at.slice(0, 10)}</td>
            </tr>
          ))}
          {!list.rows.length && <tr><td colSpan={10} className="empty">No bookings found.</td></tr>}
          {!!list.rows.length && <tr className="fill"><td colSpan={10} /></tr>}
        </tbody>
        {!!list.rows.length && <FootLine cols={10} total={list.total} />}
        </table></RowMenus>
        {list.pages > 1 && <div className="tw-foot"><Pager list={list} /></div>}</div>
    </Page>
  );
}
