import { requireUser } from '@/lib/auth';
import { flat, paginate } from '@/lib/list';
import { withModified } from '@/lib/queries/modified';
import { airlineQuery } from '@/lib/queries/airlines';
import { Page, Pager } from '@/components/ui';
import { TableFilters } from '@/components/list-filters';
import { AirlineTable, NewAirlineButton } from '@/components/airlines';

export const metadata = { title: 'Airlines' };

export default async function Airlines(props: PageProps<'/app/airlines'>) {
  await requireUser('owner');
  const q = flat(await props.searchParams);
  const [sql, p] = airlineQuery(q);
  const list = await paginate(q, sql, p, 25);
  return (
    <Page title="Airlines" actions={<NewAirlineButton />}>
      <div className="tw-card">
        <TableFilters q={q.q || ''} placeholder="Search airline name" dropdowns={[
          { key: 'status', label: 'Status', value: q.status || '', options: [['', 'All statuses'], ['active', 'Active'], ['inactive', 'Inactive']] },
        ]} />
        <AirlineTable rows={await withModified(list.rows, 'airline') as never} total={list.total} />
        {list.pages > 1 && <div className="tw-foot"><Pager list={list} /></div>}
      </div>
    </Page>
  );
}
