import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { flat, paginate, sortClause, where } from '@/lib/list';
import { peso, str } from '@/lib/util';
import { Page, Pager, SortTh } from '@/components/ui';
import { custBalance } from '@/lib/queries/core';

export const metadata = { title: 'Customers' };

export default async function Customers(props: PageProps<'/app/customers'>) {
  await requireUser();
  const q = flat(await props.searchParams);
  const w = where();
  if (q.q) { const l = `%${str(q.q, 60)}%`; w.add('(c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.code LIKE ?)', l, l, l, l); }
  if (q.owing) w.add(`${custBalance} > 0`);
  const sort = sortClause({ name: 'c.name', code: 'c.code', date: 'c.created_at', balance: 'balance' }, 'date', q);
  const list = await paginate(q, `SELECT c.*, ${custBalance} AS balance,
    (SELECT COUNT(*) FROM requests r WHERE r.customer_id=c.id) AS n_req, (SELECT COUNT(*) FROM bookings b WHERE b.customer_id=c.id) AS n_bk
    FROM customers c ${w.sql} ${sort}`, w.p);
  return (
    <Page title="Customers">
      <form className="filters" method="get" key={list.qs}>
        <div className="grow"><label htmlFor="q">Search</label><input id="q" name="q" defaultValue={q.q || ''} placeholder="Name, phone, email or customer ID" /></div>
        <div><label><input type="checkbox" name="owing" value="1" defaultChecked={!!q.owing} /> With balance owing</label></div>
        <div className="btnrow"><button className="btn">Search</button><Link className="btn ghost" href="/app/customers">Reset</Link><Link className="btn alt" href="/app/customers/new">+ New customer</Link></div>
      </form>
      <div className="tw"><table>
        <thead><tr><SortTh list={list} label="ID" k="code" /><SortTh list={list} label="Name" k="name" /><th>Contact</th><th className="num">Requests</th><th className="num">Bookings</th><SortTh list={list} label="Balance owing" k="balance" cls="num" /><SortTh list={list} label="Registered" k="date" /></tr></thead>
        <tbody>
          {list.rows.map((c) => (
            <tr key={c.id}>
              <td><Link href={`/app/customers/${c.id}`}>{c.code}</Link></td><td><Link href={`/app/customers/${c.id}`}>{c.name}</Link></td>
              <td>{c.phone}<br /><span className="muted small">{c.email}</span></td>
              <td className="num">{c.n_req}</td><td className="num">{c.n_bk}</td><td className="num">{c.balance ? peso(c.balance) : '—'}</td><td className="nowrap">{c.created_at.slice(0, 10)}</td>
            </tr>
          ))}
          {!list.rows.length && <tr><td colSpan={7} className="empty">No customers found.</td></tr>}
        </tbody></table></div>
      <Pager list={list} />
    </Page>
  );
}
