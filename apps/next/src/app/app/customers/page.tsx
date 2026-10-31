import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { flat, paginate, sortClause, where } from '@/lib/list';
import { isDate, peso, str } from '@/lib/util';
import { today } from '@/lib/util';
import { FootLine, Page, Pager, SortTh } from '@/components/ui';
import { custBalance } from '@/lib/queries/core';
import { rowMenu } from '@/lib/menu';
import { RowMenus } from '@/components/context-menu';
import { DateRangeFilter, TableFilters } from '@/components/list-filters';
import { CUSTOMER_EDIT_EVT, CUSTOMER_NEW_EVT, CustomerModals } from '@/components/customer-modals';

export const metadata = { title: 'Customers' };

export default async function Customers(props: PageProps<'/app/customers'>) {
  await requireUser();
  const q = flat(await props.searchParams);
  const w = where();
  if (q.q) { const l = `%${str(q.q, 60)}%`; w.add('(c.name LIKE ? OR c.phone LIKE ? OR c.email LIKE ? OR c.code LIKE ?)', l, l, l, l); }
  if (q.owing) w.add(`${custBalance} > 0`);
  // Registered date range (the header date menu): applied as soon as it is picked.
  if (isDate(q.from)) w.add('SUBSTR(c.created_at,1,10)>=?', q.from);
  if (isDate(q.to)) w.add('SUBSTR(c.created_at,1,10)<=?', q.to);
  const sort = sortClause({ name: 'c.name', code: 'c.code', date: 'c.created_at', balance: 'balance' }, 'date', q);
  const list = await paginate(q, `SELECT c.*, ${custBalance} AS balance,
    (SELECT COUNT(*) FROM requests r WHERE r.customer_id=c.id) AS n_req, (SELECT COUNT(*) FROM bookings b WHERE b.customer_id=c.id) AS n_bk
    FROM customers c ${w.sql} ${sort}`, w.p, 25);
  return (
    <Page title="Customer Management" actions={<CustomerModals />} filters={
      <div className="af-bar"><DateRangeFilter today={today()} showBy={false}
        initial={{ by: 'txn', from: q.from || '', to: q.to || '', range: q.range || (q.from || q.to ? 'custom' : '') }} /></div>
    }>
      <div className="tw-card">
        <TableFilters q={q.q || ''} placeholder="Search name, phone, email or customer ID" dropdowns={[
          { key: 'owing', label: 'Balance', value: q.owing || '', options: [['', 'All customers'], ['1', 'With balance owing']] },
        ]} />
        <RowMenus className="tw tw-fixed tw-fm" empty={[{ label: 'Add customer', event: CUSTOMER_NEW_EVT }]}><table>
        <thead><tr><SortTh list={list} label="ID" k="code" /><SortTh list={list} label="Name" k="name" /><th>Contact</th><th className="num">Requests</th><th className="num">Bookings</th><SortTh list={list} label="Balance owing" k="balance" cls="num" /><SortTh list={list} label="Registered" k="date" /></tr></thead>
        <tbody>
          {list.rows.map((c) => (
            <tr key={c.id} {...rowMenu([{ label: 'Open customer', href: `/app/customers/${c.id}` },
              { label: 'Edit customer', event: CUSTOMER_EDIT_EVT, detail: { id: c.id, name: c.name, phone: c.phone ?? '', email: c.email ?? '', pref_contact: c.pref_contact ?? '', notes: c.notes ?? '' } }])}>
              <td><Link href={`/app/customers/${c.id}`}>{c.code}</Link></td><td><Link href={`/app/customers/${c.id}`}>{c.name}</Link></td>
              <td>{c.phone}<br /><span className="muted small">{c.email}</span></td>
              <td className="num">{c.n_req}</td><td className="num">{c.n_bk}</td><td className="num">{c.balance ? peso(c.balance) : '—'}</td><td className="nowrap">{c.created_at.slice(0, 10)}</td>
            </tr>
          ))}
          {!list.rows.length && <tr><td colSpan={7} className="empty">No customers found.</td></tr>}
          {!!list.rows.length && <tr className="fill"><td colSpan={7} /></tr>}
        </tbody>
        {!!list.rows.length && <FootLine cols={7} total={list.total} />}
        </table></RowMenus>
        {list.pages > 1 && <div className="tw-foot"><Pager list={list} /></div>}
      </div>
    </Page>
  );
}
