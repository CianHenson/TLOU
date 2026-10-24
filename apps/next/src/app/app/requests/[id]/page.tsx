import { Fragment } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { STATUSES } from '@/lib/biz';
import { labelOf } from '@/lib/forms';
import { Page } from '@/components/ui';
import { Notes } from '@/components/notes';
import { ApiForm, Submit } from '@/components/form';
import { staffList, notesFor } from '@/lib/queries/core';

export const metadata = { title: 'Travel request' };

export default async function RequestPage(props: PageProps<'/app/requests/[id]'>) {
  await requireUser();
  const { id } = await props.params;
  const r = await db.get(`SELECT r.*, c.name AS customer, c.code AS customer_code, c.phone, c.email, u.name AS employee FROM requests r
    JOIN customers c ON c.id=r.customer_id LEFT JOIN users u ON u.id=r.assigned_to WHERE r.id=?`, [id]);
  if (!r) notFound();
  const [staff, log, notes, bookings] = await Promise.all([
    staffList(),
    db.all(`SELECT l.*, u.name AS who FROM request_log l LEFT JOIN users u ON u.id=l.user_id WHERE request_id=? ORDER BY l.id DESC`, [r.id]),
    notesFor('request', r.id),
    db.all('SELECT id,ref,status FROM bookings WHERE request_id=?', [r.id]),
  ]);
  let details: Record<string, string> = {};
  try { details = JSON.parse(r.details || '{}'); } catch { /* keep empty */ }
  const labels = labelOf(r.service_type);
  return (
    <Page title={r.ref}>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div>
          <div className="card"><h2>{r.ref} <span className="badge b-info">{r.status}</span></h2>
            <dl className="kv">
              <dt>Customer</dt><dd><Link href={`/app/customers/${r.customer_id}`}>{r.customer}</Link> ({r.customer_code})</dd>
              <dt>Phone</dt><dd>{r.phone || '—'}</dd><dt>Email</dt><dd>{r.email || '—'}</dd>
              <dt>Service</dt><dd>{r.service_type}</dd><dt>Source</dt><dd>{r.source}</dd><dt>Received</dt><dd>{r.created_at.slice(0, 16)}</dd><dt>Assigned to</dt><dd>{r.employee || 'Unassigned'}</dd>
            </dl></div>
          <div className="card"><h3>Travel details</h3>
            <dl className="kv">
              {Object.entries(details).filter(([k]) => k !== 'contact_phone').map(([k, v]) => (
                <Fragment key={k}><dt>{k === 'contact_method' ? 'Preferred contact' : (labels[k] || k)}</dt><dd style={{ whiteSpace: 'pre-line' }}>{v}</dd></Fragment>
              ))}
            </dl>
            <p><Link className="btn alt sm" href={`/app/bookings/new?request=${r.id}`}>Create booking / quotation</Link>
              {bookings.map((b) => <span key={b.id}> <Link className="btn ghost sm" href={`/app/bookings/${b.id}`}>{b.ref} ({b.status})</Link></span>)}</p></div>
        </div>
        <div>
          <ApiForm action={`/api/requests/${r.id}/status`} className="card">
            <h3>Update status</h3>
            <div className="field"><label htmlFor="st">Status</label><select id="st" name="status" defaultValue={r.status}>{STATUSES.map((s) => <option key={s}>{s}</option>)}</select></div>
            <div className="field"><label htmlFor="as">Assign to</label><select id="as" name="assigned_to" defaultValue=""><option value="">Keep current</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            <div className="field"><label htmlFor="nt">Note on action taken</label><textarea id="nt" name="note" rows={2} maxLength={1000} /></div>
            <Submit>Save</Submit>
          </ApiForm>
          <div className="card"><h3>Status history</h3><ul className="timeline">
            {log.map((l) => (
              <li key={l.id}><strong>{l.to_status}</strong>{l.from_status && <> <span className="muted small">from {l.from_status}</span></>}{l.note && <div>{l.note}</div>}
                <div className="small muted">{l.who || 'Customer / system'} · {l.at.slice(0, 16)}</div></li>
            ))}</ul></div>
        </div>
      </div>
      <Notes entity="request" id={r.id} notes={notes} />
    </Page>
  );
}
