import { redirect } from 'next/navigation';
import { requireUser, isOwner } from '@/lib/auth';
import { flat } from '@/lib/list';
import { KIND_LABEL, daysLeft, staffTrash } from '@/lib/queries/trash';
import { str } from '@/lib/util';
import { Page } from '@/components/ui';
import { TableFilters } from '@/components/list-filters';
import { TrashTable, type TrashRow } from '@/components/trash-table';

export const metadata = { title: 'Trash' };

/** Staff: the records they deleted themselves. They can restore one or remove it for good within 30 days; after that it is only in the owner's Delete Archive. */
export default async function Trash(props: PageProps<'/app/trash'>) {
  const me = await requireUser();
  if (isOwner(me)) redirect('/app/delete-archive');
  const q = flat(await props.searchParams);
  const search = str(q.q, 60).toLowerCase();
  const rows: TrashRow[] = (await staffTrash(me.id))
    .filter((t) => (!search || `${t.label} ${t.detail ?? ''} ${KIND_LABEL[t.kind] ?? ''}`.toLowerCase().includes(search)))
    .map((t) => {
      const left = daysLeft(t.deleted_at);
      return {
        id: t.id, type: KIND_LABEL[t.kind] ?? t.kind, label: t.label, detail: t.detail ?? '', amount: t.amount == null ? null : Number(t.amount), deleted_at: t.deleted_at,
        status: left === 0 ? 'Last day' : `${left} ${left === 1 ? 'day' : 'days'} left`, tone: left <= 3 ? 'b-err' : left <= 7 ? 'b-warn' : 'b-ok',
      };
    });
  return (
    <Page title="Trash">
      <div className="tw-card">
        <TableFilters q={q.q || ''} placeholder="Search deleted record" dropdowns={[]} />
        <TrashTable rows={rows} total={rows.length} owner={false} />
      </div>
    </Page>
  );
}
