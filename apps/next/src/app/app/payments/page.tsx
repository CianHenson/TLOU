import Link from 'next/link';
import { requireUser, isOwner } from '@/lib/auth';
import { METHODS } from '@/lib/biz';
import { flat, paginate } from '@/lib/list';
import { longDate, peso, today } from '@/lib/util';
import { FootLine, Page, Pager, SortTh } from '@/components/ui';
import { PrintButton } from '@/components/widgets';
import { staffList } from '@/lib/queries/core';
import { paymentQuery, paymentTotals, payableBookings } from '@/lib/queries/payments';
import { rowMenu } from '@/lib/menu';
import { RowMenus } from '@/components/context-menu';
import { DateRangeFilter, TableFilters } from '@/components/list-filters';
import { KIND_BADGE, PAYMENT_NEW_EVT, PAYMENT_VIEW_EVT, PaymentModals, STATUS_BADGE, ViewPayment, type PaymentView } from '@/components/payment-modals';

export const metadata = { title: 'Payments & Transactions' };

export default async function Payments(props: PageProps<'/app/payments'>) {
  const me = await requireUser();
  const q = flat(await props.searchParams);
  const [sql, p] = paymentQuery(q);
  const [list, staff, sums, bookings] = await Promise.all([paginate(q, sql, p, 25), staffList(), paymentTotals(sql, p), payableBookings()]);
  const td = today();
  const who = staff.find((s) => String(s.id) === q.employee)?.name;
  const active = [q.kind, q.pstatus, METHODS.includes(q.method) && q.method, who && `recorded by ${who}`, (q.from || q.to) && `dates ${q.from ? longDate(q.from) : 'start'} to ${q.to ? longDate(q.to) : 'today'}`, q.q && `search "${q.q}"`].filter(Boolean);
  const note = active.length ? `Filters are active (${active.join(', ')}). Only the filtered transactions will be exported.` : undefined;
  const view = (r: Record<string, any>): PaymentView => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
    id: r.id, ref: r.ref, paid_at: r.paid_at, kind: r.kind, status: r.status, amount: Number(r.amount), method: r.method, reference: r.reference || '', remarks: r.remarks || '',
    customer: r.customer, customer_id: r.customer_id, booking_ref: r.booking_ref, recorder: r.recorder || '', created_at: r.created_at, reversed_reason: r.reversed_reason || '',
  });
  const owner = isOwner(me);
  const net = sums.received - sums.refunds;
  return (
    <Page title="Payments & Transactions" actions={<PaymentModals bookings={bookings} today={td} />} filters={
      <div className="af-bar"><DateRangeFilter today={td} showBy={false}
        initial={{ by: 'txn', from: q.from || '', to: q.to || '', range: q.range || (q.from || q.to ? 'custom' : '') }} /></div>
    }>
      <div className="tw-card">
        <TableFilters q={q.q || ''} placeholder="Search payment ID, customer, booking, reference" exportHref={`/api/payments/export?${list.qs}`}
          exportTitle="Export the filtered transactions as CSV" exportNote={note} trail={<PrintButton className="btn ghost tt-export">Print</PrintButton>} dropdowns={[
            { key: 'kind', label: 'Type', value: q.kind || '', options: [['', 'All types'], 'Payment', 'Refund'] },
            { key: 'pstatus', label: 'Status', value: q.pstatus || '', options: [['', 'All statuses'], 'Valid', 'Reversed'] },
            { key: 'method', label: 'Payment method', value: q.method || '', options: [['', 'All methods'], ...METHODS] },
            { key: 'employee', label: 'Recorded by', value: q.employee || '', options: [['', 'Anyone'], ...staff.map((s): [string, string] => [String(s.id), s.name])] },
          ]} />
        <div className="pay-sum" aria-label="Transaction summary">
          <span>Payments received <b className="pos">{peso(sums.received)}</b></span>
          <span>Refunds <b className="neg">{peso(sums.refunds)}</b></span>
          <span>Net collected <b>{peso(net)}</b></span>
          <span>Transactions <b>{sums.n}</b>{sums.reversed ? <i> · {sums.reversed} reversed (not counted)</i> : null}</span>
        </div>
        <RowMenus className="tw tw-fixed tw-fm pay-tw" empty={[{ label: 'Record payment', event: PAYMENT_NEW_EVT }]}><table>
          <colgroup>{[10, 10, 15, 9, 11, 9, 10, 9, 11, 6].map((w, i) => <col key={i} style={{ width: w + '%' }} />)}</colgroup>
          <thead><tr><SortTh list={list} label="ID" k="ref" /><SortTh list={list} label="Date" k="date" /><SortTh list={list} label="Customer" k="customer" /><th>Booking</th><th>Type</th><th>Method</th><th>Reference</th><th>Recorded by</th><SortTh list={list} label="Amount" k="amount" cls="num" /><th></th></tr></thead>
          <tbody>
            {list.rows.map((r) => (
              <tr key={r.id} className={r.status === 'Reversed' ? 'off' : ''} {...rowMenu([
                { label: 'View details', event: PAYMENT_VIEW_EVT, detail: view(r) }, { label: 'Open customer', href: `/app/customers/${r.customer_id}` },
                owner && r.status === 'Valid' && { label: 'Reverse payment', reason: `/api/payments/${r.id}/reverse`, title: `Reverse ${r.ref}`, danger: true }])}>
                <td className="nowrap"><strong>{r.ref}</strong></td><td className="nowrap">{r.paid_at}</td>
                <td><Link href={`/app/customers/${r.customer_id}`}>{r.customer}</Link></td><td className="nowrap">{r.booking_ref}</td>
                <td><span className={`badge ${KIND_BADGE[r.kind] ?? ''}`}>{r.kind}</span>{r.status === 'Reversed' && <> <span className={`badge ${STATUS_BADGE.Reversed}`}>Reversed</span></>}</td>
                <td>{r.method}</td><td>{r.reference || <span className="muted">—</span>}</td><td>{r.recorder || <span className="muted">—</span>}</td>
                <td className="num nowrap"><strong>{r.kind === 'Refund' ? '−' : ''}{peso(r.amount)}</strong></td><td className="num"><ViewPayment p={view(r)} /></td>
              </tr>
            ))}
            {!list.rows.length && <tr><td colSpan={10} className="empty"><span className="empty-msg">No transactions found.</span></td></tr>}
            {!!list.rows.length && <tr className="fill"><td colSpan={10} /></tr>}
          </tbody>
          {!!list.rows.length && <FootLine cols={10} total={list.total} right={`Net collected: ${peso(net)}`} />}
        </table></RowMenus>
        {list.pages > 1 && <div className="tw-foot"><Pager list={list} /></div>}
      </div>
    </Page>
  );
}
