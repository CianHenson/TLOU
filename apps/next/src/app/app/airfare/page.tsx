import { requireUser, isOwner } from '@/lib/auth';
import { CHECKIN_STATUSES } from '@/lib/biz';
import { db } from '@/lib/db';
import { activeAirlineNames } from '@/lib/queries/airlines';
import { BatchUploadButton } from '@/components/batch-upload';
import { AIRFARE_COLS } from '@/lib/batch-cols';
import { flat, paginate } from '@/lib/list';
import { longDate, today } from '@/lib/util';
import { withModified } from '@/lib/queries/modified';
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
  // The form offers the active airlines; the filter also lists airlines that only exist on older sales (deactivated or renamed).
  const active = await activeAirlineNames();
  const used = (await db.all<{ airline: string }>(`SELECT DISTINCT airline FROM airfare_sales WHERE airline<>''`)).map((r) => r.airline);
  const airlineOpts = [...new Set([...active, ...used, ...airlines])].sort((a, b) => a.localeCompare(b));
  const dates = q.from || q.to ? `${q.by === 'travel' ? 'travel' : 'transaction'} dates ${q.from ? longDate(q.from) : 'start'} to ${q.to ? longDate(q.to) : 'today'}` : '';
  const filtersOn = [dates, airlines.length && `airlines: ${airlines.join(', ')}`, statuses.length && `check-in: ${statuses.join(', ')}`, q.q && `search "${q.q}"`].filter(Boolean);
  const note = filtersOn.length ? `Filters are active (${filtersOn.join(', ')}). Only the filtered sales will be exported.` : undefined;
  return (
    <Page title="Passenger Airfare Sales" actions={<>
      <CheckinButton rows={soon} />
      <BatchUploadButton title="Batch upload airfare sales" action="/api/airfare/batch" cols={AIRFARE_COLS} template="airfare-sales-template.csv" />
      <NewSaleButton today={today()} airlines={active} />
    </>} filters={
      <div className="af-bar"><DateRangeFilter today={today()} initial={{
        by: q.by === 'travel' ? 'travel' : 'txn', from: q.from || '', to: q.to || '', range: q.range || (q.from || q.to ? 'custom' : '') }} /></div>
    }>
      <div className="tw-card">
      <AirfareTableFilters airlines={airlineOpts} statuses={CHECKIN_STATUSES} exportHref={`/api/airfare/export?${list.qs}`} exportNote={note}
        initial={{ q: q.q || '', airline: airlines.join(','), status: statuses.join(',') }} />
      <AirfareTable rows={await withModified(list.rows, 'airfare')} owner={isOwner(me)} meId={me.id} totals={{ n_all: list.total, total: Number(sums.total), sc: Number(sums.sc), fee: Number(sums.fee) }} />
      {list.pages > 1 && <div className="tw-foot"><Pager list={list} /></div>}
      </div>
    </Page>
  );
}
