import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { flat, paginate, where } from '@/lib/list';
import { KIND_LABEL, TRASH_DAYS, daysLeft, trashCutoff } from '@/lib/queries/trash';
import { str } from '@/lib/util';
import { Page, Pager } from '@/components/ui';
import { TableFilters } from '@/components/list-filters';
import { TrashTable, type TrashRow } from '@/components/trash-table';
import { ROLE_LABELS } from '@/lib/types';

export const metadata = { title: 'Delete Archive' };

/** Owner / admin: everything that was deleted (by staff, admins or the owner). Records are never erased; the only action is Restore. */
export default async function DeleteArchive(props: PageProps<'/app/delete-archive'>) {
  await requireUser('owner');
  const q = flat(await props.searchParams);
  const w = where();
  w.add('t.restored_at IS NULL');
  if (q.q) { const l = `%${str(q.q, 60)}%`; w.add('(t.label LIKE ? OR t.detail LIKE ? OR u.name LIKE ?)', l, l, l); }
  const list = await paginate(q, `SELECT t.*, u.name AS by_name FROM trash t LEFT JOIN users u ON u.id=t.deleted_by ${w.sql} ORDER BY t.id DESC`, w.p, 25);
  const cutoff = trashCutoff();
  const rows: TrashRow[] = list.rows.map((t) => {
    const staff = t.deleted_role === 'employee';
    const status = !staff ? `Deleted by ${ROLE_LABELS[t.deleted_role]?.toLowerCase() ?? t.deleted_role}`
      : t.hidden_at ? 'Permanently deleted by staff' : t.deleted_at < cutoff ? `Past ${TRASH_DAYS} days` : 'In staff trash';
    return {
      id: t.id, type: KIND_LABEL[t.kind] ?? t.kind, label: t.label, detail: t.detail ?? '', amount: t.amount == null ? null : Number(t.amount), deleted_at: t.deleted_at,
      by: `${t.by_name ?? 'Unknown'} (${ROLE_LABELS[t.deleted_role] ?? t.deleted_role})`, status,
      tone: staff && !t.hidden_at && t.deleted_at >= cutoff ? 'b-warn' : staff ? 'b-err' : 'b-info',
      sub: staff && !t.hidden_at && t.deleted_at >= cutoff ? `${daysLeft(t.deleted_at)} days left for staff` : undefined,
    };
  });
  return (
    <Page title="Delete Archive">
      <div className="tw-card">
        <TableFilters q={q.q || ''} placeholder="Search record, detail or who deleted it" dropdowns={[]} />
        <TrashTable rows={rows} total={list.total} owner />
        {list.pages > 1 && <div className="tw-foot"><Pager list={list} /></div>}
      </div>
    </Page>
  );
}
