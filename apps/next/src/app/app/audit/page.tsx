import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { flat, paginate } from '@/lib/list';
import { auditFilter } from '@/lib/queries/owner';
import { longDate, time12, today } from '@/lib/util';
import { FootLine, Page } from '@/components/ui';
import { DateRangeFilter, TableFilters } from '@/components/list-filters';

export const metadata = { title: 'Audit Logs' };

const MAX_ROWS = 1000;

export default async function Audit(props: PageProps<'/app/audit'>) {
  await requireUser('owner');
  const q = flat(await props.searchParams);
  const { sql, p } = auditFilter(q);
  // One scrolling list (no pages), capped so a huge log cannot bog the page down; filters narrow it further.
  const list = await paginate({ ...q, page: '1' }, sql, p, MAX_ROWS);
  const entities = (await db.all('SELECT DISTINCT entity FROM audit_logs WHERE entity IS NOT NULL ORDER BY 1')).map((r) => r.entity as string);
  const actions = (await db.all('SELECT DISTINCT action FROM audit_logs ORDER BY 1')).map((r) => r.action as string);
  const qv = new URLSearchParams(list.qs), g = (k: string) => qv.get(k) || '';
  const active = [g('action') && `action: ${g('action')}`, g('entity') && `entity: ${g('entity')}`, (g('from') || g('to')) && `dates ${g('from') ? longDate(g('from')) : 'start'} to ${g('to') ? longDate(g('to')) : 'today'}`, g('q') && `search "${g('q')}"`].filter(Boolean);
  const note = active.length ? `Filters are active (${active.join(', ')}). Only the filtered log entries will be exported.` : undefined;
  return (
    <Page title="Audit Logs" filters={
      <div className="af-bar"><DateRangeFilter today={today()} showBy={false} initial={{
        by: 'txn', from: q.from || '', to: q.to || '', range: q.range || (q.from || q.to ? 'custom' : '') }} /></div>
    }>
      <div className="tw-card">
      <TableFilters q={g('q')} placeholder="Search action, user, detail, record ID" exportHref={`/api/audit/export?${list.qs}`}
        exportTitle="Export the filtered log entries as CSV" exportNote={note}
        dropdowns={[
          { key: 'action', label: 'Action', value: g('action'), options: [['', 'All actions'], ...actions] },
          { key: 'entity', label: 'Entity', value: g('entity'), options: [['', 'All entities'], ...entities] },
        ]} />
      <div className="tw tw-fixed tw-fm"><table><colgroup><col /><col /><col /><col /><col /><col style={{ width: '40%' }} /></colgroup><thead><tr><th>Date</th><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Detail</th></tr></thead><tbody>
        {list.rows.map((r) => <tr key={r.id}><td className="nowrap">{longDate(r.at.slice(0, 10))}</td><td className="nowrap">{time12(r.at)}</td><td>{r.username || '—'}</td><td>{r.action}</td><td>{r.entity} {r.entity_id}</td><td className="small" style={{ maxWidth: 420, overflowWrap: 'anywhere' }}>{r.detail}</td></tr>)}
        {!list.rows.length && <tr><td colSpan={6} className="empty">No log entries.</td></tr>}
        {!!list.rows.length && <tr className="fill"><td colSpan={6} /></tr>}</tbody>
        {!!list.rows.length && <FootLine cols={6} total={list.total} right={list.total > MAX_ROWS && `Showing the latest ${MAX_ROWS.toLocaleString()} — use the filters to narrow it down`} />}</table></div></div>
    </Page>
  );
}
