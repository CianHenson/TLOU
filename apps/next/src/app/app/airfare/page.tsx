import { requireUser, isOwner } from '@/lib/auth';
import { AIRLINES, CHECKIN_STATUSES } from '@/lib/biz';
import { flat, paginate } from '@/lib/list';
import { longDate, today } from '@/lib/util';
import { airfareFilters, airfareQuery, airfareTotals, needsCheckin } from '@/lib/queries/airfare';
import { Page, Pager } from '@/components/ui';
import { CheckinButton } from '@/components/checkin-button';
import { NewSaleButton } from '@/components/new-sale-button';
import { DateRangeFilter, AirfareTableFilters } from '@/components/list-filters';
import { AirfareTable } from '@/components/airfare-table';

export const metadata = { title: 'Airfare Sales' };

export default async function Airfare(props: PageProps<'/app/airfare'>) {
  const me = await requireUser();
  const q = flat(await props.searchParams);
  const [sql, p] = airfareQuery(q);
  const [list, soon, sums] = await Promise.all([paginate(q, sql, p, 25), needsCheckin(48), airfareTotals(sql, p)]);
  const { airlines, statuses } = airfareFilters(q);
  // Airlines typed in by hand (outside the standard list) stay selectable once they are in the URL.
  const airlineOpts = [...AIRLINES, ...airlines.filter((a) => !AIRLINES.includes(a))];
  const dates = q.from || q.to ? `${q.by === 'travel' ? 'travel' : 'transaction'} dates ${q.from ? longDate(q.from) : 'start'} to ${q.to ? longDate(q.to) : 'today'}` : '';
  const active = [dates, airlines.length && `airlines: ${airlines.join(', ')}`, statuses.length && `check-in: ${statuses.join(', ')}`, q.q && `search "${q.q}"`].filter(Boolean);
  const note = active.length ? `Filters are active (${active.join(', ')}). Only the filtered sales will be exported.` : undefined;
  return (
    <Page title="Passenger Airfare Sales" actions={<>
      <CheckinButton rows={soon} />
      <NewSaleButton today={today()} />
    </>} filters={
      <div className="af-bar"><DateRangeFilter today={today()} initial={{
        by: q.by === 'travel' ? 'travel' : 'txn', from: q.from || '', to: q.to || '', range: q.range || (q.from || q.to ? 'custom' : '') }} /></div>
    }>
      <div className="tw-card">
      <AirfareTableFilters airlines={airlineOpts} statuses={CHECKIN_STATUSES} exportHref={`/api/airfare/export?${list.qs}`} exportNote={note}
        initial={{ q: q.q || '', airline: airlines.join(','), status: statuses.join(',') }} />
      <AirfareTable rows={list.rows} owner={isOwner(me)} totals={{ n_all: list.total, total: Number(sums.total), sc: Number(sums.sc), fee: Number(sums.fee) }} />
      {list.pages > 1 && <div className="tw-foot"><Pager list={list} /></div>}
      </div>
    </Page>
  );
}
