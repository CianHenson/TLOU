import Link from 'next/link';
import { requireUser, isOwner } from '@/lib/auth';
import { AIRLINES, CHECKIN_STATUSES } from '@/lib/biz';
import { flat, paginate } from '@/lib/list';
import { peso, today } from '@/lib/util';
import { airfareQuery, needsCheckin } from '@/lib/queries/airfare';
import { Badge, Page, Pager } from '@/components/ui';
import { ApiForm, Submit } from '@/components/form';
import { CheckinButton } from '@/components/checkin-button';
import { NewSaleButton } from '@/components/new-sale-button';
import { DateRangeFilter, AirfareTableFilters } from '@/components/list-filters';

export const metadata = { title: 'Airfare Sales' };

const CLS: Record<string, string> = { Pending: 'b-warn', Done: 'b-ok', Rebooked: 'b-info', 'No-show': 'b-err', Cancelled: 'b-err' };

export default async function Airfare(props: PageProps<'/app/airfare'>) {
  const me = await requireUser();
  const q = flat(await props.searchParams);
  const [sql, p] = airfareQuery(q);
  const [list, soon] = await Promise.all([paginate(q, sql, p, 25), needsCheckin(48)]);
  const owner = isOwner(me);
  return (
    <Page title="Passenger Airfare Sales" actions={<>
      <CheckinButton rows={soon} />
      <NewSaleButton today={today()} />
    </>} filters={
      <div className="af-bar"><DateRangeFilter today={today()} initial={{
        by: q.by === 'travel' ? 'travel' : 'txn', from: q.from || '', to: q.to || '', range: q.range || (q.from || q.to ? 'custom' : '') }} /></div>
    }>
      <div className="tw-card">
      <AirfareTableFilters airlines={AIRLINES} statuses={CHECKIN_STATUSES} exportHref={`/api/airfare/export?${list.qs}`}
        initial={{ q: q.q || '', airline: q.airline || '', status: q.status || '' }} />
      <div className="tw tw-fixed"><table><thead><tr>
        <th>Transaction date</th><th>Airline</th><th>PNR</th><th className="num">PAX</th><th>Passenger</th><th>Contact number</th><th>Email / Facebook</th><th>Origin</th><th>Destination</th>
        <th>Travel date</th><th>Time</th><th>Check-in</th><th>Airline ID / flight no.</th><th className="num">Total amount</th><th className="num">Service charge</th>
        <th className="num">Card fee</th><th>Remarks</th><th></th></tr></thead><tbody>
        {list.rows.map((r) => (
          <tr key={r.id} className={r.checkin_status === 'Cancelled' ? 'off' : ''}>
            <td className="nowrap">{r.txn_date}</td><td className="nowrap">{r.airline}</td><td><strong>{r.pnr}</strong></td><td className="num">{r.pax}</td><td>{r.passenger}</td>
            <td className="nowrap">{r.contact}</td><td>{r.email_fb}</td><td>{r.origin}</td><td>{r.destination}</td><td className="nowrap">{r.travel_date}</td><td>{r.travel_time}</td>
            <td><Badge cls={CLS[r.checkin_status]}>{r.checkin_status}</Badge></td><td>{r.flight_no}</td><td className="num">{peso(r.total_amount)}</td>
            <td className="num">{peso(r.service_charge)}</td><td className="num" style={{ color: r.card_fee ? 'var(--err)' : undefined }}>{r.card_fee ? `(${peso(r.card_fee)})` : '—'}</td>
            <td className="small">{r.remarks}</td>
            <td className="nowrap"><Link href={`/app/airfare/${r.id}`}>Edit</Link>{owner && <ApiForm action={`/api/airfare/${r.id}/delete`} style={{ display: 'inline', marginLeft: 8 }}>
              <Submit className="btn danger sm" confirm={`Delete the sale for ${r.passenger} (PNR ${r.pnr})?`}>Delete</Submit></ApiForm>}</td>
          </tr>
        ))}
        {!list.rows.length && <tr><td colSpan={18} className="empty">No airfare sales recorded.</td></tr>}
      </tbody></table></div>
      </div>
      <Pager list={list} />
    </Page>
  );
}
