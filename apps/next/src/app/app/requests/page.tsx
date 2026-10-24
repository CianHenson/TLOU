import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { STATUSES, SERVICE_TYPES } from '@/lib/biz';
import { flat, paginate, sortClause, where } from '@/lib/list';
import { str, intOrNull, isDate } from '@/lib/util';
import { Page, Pager, SortTh } from '@/components/ui';
import { staffList, reqBadge } from '@/lib/queries/core';

export const metadata = { title: 'Travel Requests' };

export default async function Requests(props: PageProps<'/app/requests'>) {
  await requireUser();
  const q = flat(await props.searchParams);
  const w = where();
  if (q.q) { const l = `%${str(q.q, 60)}%`; w.add('(r.ref LIKE ? OR c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ?)', l, l, l, l); }
  if (STATUSES.includes(q.status)) w.add('r.status=?', q.status);
  if (q.status === 'open') w.add(`r.status NOT IN ('Completed','Cancelled','Rejected')`);
  if (SERVICE_TYPES.includes(q.service)) w.add('r.service_type=?', q.service);
  if (intOrNull(q.employee)) w.add('r.assigned_to=?', Number(q.employee));
  if (isDate(q.from)) w.add('SUBSTR(r.created_at,1,10)>=?', q.from);
  if (isDate(q.to)) w.add('SUBSTR(r.created_at,1,10)<=?', q.to);
  const sort = sortClause({ date: 'r.created_at', ref: 'r.ref', customer: 'c.name', status: 'r.status' }, 'date', q);
  const [list, staff] = await Promise.all([
    paginate(q, `SELECT r.*, c.name AS customer, c.code AS customer_code, u.name AS employee FROM requests r
      JOIN customers c ON c.id=r.customer_id LEFT JOIN users u ON u.id=r.assigned_to ${w.sql} ${sort}`, w.p),
    staffList(),
  ]);
  return (
    <Page title="Travel Requests">
      <form className="card filters" method="get" key={list.qs}>
        <div className="grow"><label htmlFor="q">Search</label><input id="q" name="q" defaultValue={q.q || ''} placeholder="Reference, customer, phone, email" /></div>
        <div><label>Status</label><select name="status" defaultValue={q.status || ''}><option value="">All</option><option value="open">All open</option>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label>Service</label><select name="service" defaultValue={q.service || ''}><option value="">All</option>{SERVICE_TYPES.map((s) => <option key={s}>{s}</option>)}</select></div>
        <div><label>Assigned to</label><select name="employee" defaultValue={q.employee || ''}><option value="">Anyone</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div><label>From</label><input type="date" name="from" defaultValue={q.from || ''} /></div>
        <div><label>To</label><input type="date" name="to" defaultValue={q.to || ''} /></div>
        <div className="btnrow"><button className="btn">Filter</button><Link className="btn ghost" href="/app/requests">Reset</Link><Link className="btn alt" href="/app/requests/new">+ Register request</Link></div>
      </form>
      <div className="tw"><table>
        <thead><tr><SortTh list={list} label="Reference" k="ref" /><SortTh list={list} label="Customer" k="customer" /><th>Service</th><SortTh list={list} label="Status" k="status" /><th>Source</th><th>Assigned</th><SortTh list={list} label="Received" k="date" /></tr></thead>
        <tbody>
          {list.rows.map((r) => (
            <tr key={r.id}>
              <td><Link href={`/app/requests/${r.id}`}>{r.ref}</Link></td><td><Link href={`/app/customers/${r.customer_id}`}>{r.customer}</Link></td><td>{r.service_type}</td>
              <td><span className={`badge ${reqBadge(r.status)}`}>{r.status}</span></td>
              <td>{r.source}</td><td>{r.employee || '—'}</td><td className="nowrap">{r.created_at.slice(0, 16)}</td>
            </tr>
          ))}
          {!list.rows.length && <tr><td colSpan={7} className="empty">No requests found.</td></tr>}
        </tbody></table></div>
      <Pager list={list} />
    </Page>
  );
}
