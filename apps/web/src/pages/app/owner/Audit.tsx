import type { FormEvent } from 'react';
import { download } from '../../../lib/api';
import { useList } from '../../../lib/list';
import { usePageTitle } from '../../../lib/title';
import type { Page } from '../../../lib/types';
import Pager from '../../../ui/Pager';

interface Row { id: number; at: string; username: string | null; action: string; entity: string | null; entity_id: string | null; detail: string; ip: string | null }

export default function Audit() {
  usePageTitle('Audit Logs');
  const { data, params, set, qs } = useList<Row>('/audit');
  const entities = (data as (Page<Row> & { entities?: string[] }) | undefined)?.entities ?? [];

  const filter = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    set({ q: String(f.get('q')), entity: String(f.get('entity')), from: String(f.get('from')), to: String(f.get('to')) });
  };

  return (
    <>
      {/* key remounts the inputs when the URL changes (e.g. browser back) so they show the active filters */}
      <form key={qs} className="card filters" onSubmit={filter}>
        <div className="grow"><label>Search</label><input name="q" defaultValue={params.q ?? ''} placeholder="Action, user, detail, record ID" /></div>
        <div><label>Entity</label><select name="entity" defaultValue={params.entity ?? ''}><option value="">All</option>{entities.map((e) => <option key={e}>{e}</option>)}</select></div>
        <div><label>From</label><input type="date" name="from" defaultValue={params.from ?? ''} /></div>
        <div><label>To</label><input type="date" name="to" defaultValue={params.to ?? ''} /></div>
        <div className="btnrow">
          <button className="btn">Filter</button>
          <button type="button" className="btn ghost" onClick={() => download(`/audit?${qs ? qs + '&' : ''}export=csv`, 'audit-log.csv')}>Export CSV</button>
        </div>
      </form>
      <div className="tw"><table><thead><tr><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Detail</th><th>IP</th></tr></thead><tbody>
        {data?.rows.map((r) => (
          <tr key={r.id}><td className="nowrap">{r.at}</td><td>{r.username || '—'}</td><td>{r.action}</td><td>{r.entity} {r.entity_id}</td>
            <td className="small" style={{ maxWidth: 420, overflowWrap: 'anywhere' }}>{r.detail}</td><td>{r.ip}</td></tr>
        ))}
        {data && !data.rows.length && <tr><td colSpan={6} className="empty">No log entries.</td></tr>}
      </tbody></table></div>
      {data && <Pager page={data.page} pages={data.pages} total={data.total} onPage={(p) => set({ page: p })} />}
    </>
  );
}
