import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { flat, paginate } from '@/lib/list';
import { auditFilter } from '@/lib/queries/owner';
import { FootLine, Page, Pager } from '@/components/ui';
import { ExportLink } from '@/components/widgets';

export const metadata = { title: 'Audit Logs' };

export default async function Audit(props: PageProps<'/app/audit'>) {
  await requireUser('owner');
  const q = flat(await props.searchParams);
  const { sql, p } = auditFilter(q);
  const list = await paginate(q, sql, p, 30);
  const entities = (await db.all('SELECT DISTINCT entity FROM audit_logs WHERE entity IS NOT NULL ORDER BY 1')).map((r) => r.entity as string);
  const qv = new URLSearchParams(list.qs), g = (k: string) => qv.get(k) || '';
  const active = [g('entity') && `entity: ${g('entity')}`, (g('from') || g('to')) && `dates ${g('from') || 'start'} to ${g('to') || 'today'}`, g('q') && `search "${g('q')}"`].filter(Boolean);
  const note = active.length ? `Filters are active (${active.join(', ')}). Only the filtered log entries will be exported.` : undefined;
  return (
    <Page title="Audit Logs">
      <form className="card filters" method="get">
        <div className="grow"><label>Search</label><input name="q" defaultValue={g('q')} placeholder="Action, user, detail, record ID" /></div>
        <div><label>Entity</label><select name="entity" defaultValue={g('entity')}><option value="">All</option>{entities.map((e) => <option key={e}>{e}</option>)}</select></div>
        <div><label>From</label><input type="date" name="from" defaultValue={g('from')} /></div><div><label>To</label><input type="date" name="to" defaultValue={g('to')} /></div>
        <div className="btnrow"><button className="btn">Filter</button><ExportLink href={`/api/audit/export?${list.qs}`} note={note}>Export CSV</ExportLink></div>
      </form>
      <div className="tw-card"><div className="tw tw-fixed tw-fm"><table><colgroup><col /><col /><col /><col /><col style={{ width: '40%' }} /></colgroup><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Detail</th><th>IP</th></tr></thead><tbody>
        {list.rows.map((r) => <tr key={r.id}><td className="nowrap">{r.at}</td><td>{r.username || '—'}</td><td>{r.action}</td><td>{r.entity} {r.entity_id}</td><td className="small" style={{ maxWidth: 420, overflowWrap: 'anywhere' }}>{r.detail}</td><td>{r.ip}</td></tr>)}
        {!list.rows.length && <tr><td colSpan={6} className="empty">No log entries.</td></tr>}
        {!!list.rows.length && <tr className="fill"><td colSpan={6} /></tr>}</tbody>
        {!!list.rows.length && <FootLine cols={6} total={list.total} />}</table></div>
      {list.pages > 1 && <div className="tw-foot"><Pager list={list} /></div>}</div>
    </Page>
  );
}
