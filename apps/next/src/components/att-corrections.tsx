'use client';
// Attendance Monitoring → "Corrections" header button: staff requests to correct their attendance (sent from My Attendance →
// right-click → Apply for correction). Pending ones can be approved (applies the change) or declined with a reason the
// employee sees.
import { useState } from 'react';
import { longDate } from '@/lib/util';
import { CORR_FIELDS, LEAVE_BADGE, LEAVE_STATUSES, type Row } from '@/lib/types';
import { ApiForm, Field, Submit } from './form';
import { Modal, usePost } from './modal';

const label = Object.fromEntries(CORR_FIELDS);
const what = (r: Row) => (JSON.parse(r.changes) as { field: string; value: string }[]).map((c) => `${label[c.field] ?? c.field}: ${c.value}`);

function Decline({ r, onClose }: { r: Row; onClose: () => void }) {
  return (
    <Modal title={`Decline correction — ${r.name}`} onClose={onClose} width={520}>
      {(close) => (
        <ApiForm action={`/api/attendance/corrections/${r.id}/review`} stay onDone={(d) => { if (d.ok) close(); }}>
          <input type="hidden" name="action" value="decline" />
          <p className="small muted" style={{ marginTop: 0 }}>{longDate(r.day)}. {r.name} will see this reason.</p>
          <Field name="decline_reason" label="Reason for declining *" type="textarea" attrs={{ required: true, maxLength: 1000, rows: 3 }} />
          <div className="row"><Submit className="btn danger">Decline request</Submit> <button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
        </ApiForm>
      )}
    </Modal>
  );
}

export function CorrectionsButton({ rows }: { rows: Row[] }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('Pending');
  const [declining, setDeclining] = useState<Row | null>(null);
  const [acting, setActing] = useState<number | null>(null);
  const { post } = usePost();
  const pending = rows.filter((r) => r.status === 'Pending').length;
  const shown = tab === 'All' ? rows : rows.filter((r) => r.status === tab);
  const approve = async (r: Row) => {
    if (!window.confirm(`Approve ${r.name}'s correction for ${longDate(r.day)}? The record will be changed (the original times are kept in the correction log).`)) return;
    setActing(r.id);
    await post(`/api/attendance/corrections/${r.id}/review`, { action: 'approve' });
    setActing(null);
  };
  return (
    <>
      <button type="button" className="btn ghost" onClick={() => setOpen(true)}>
        Corrections <span className={`badge ${pending ? 'b-warn' : ''}`} style={{ marginLeft: 6 }}>{pending}</span>
      </button>
      {open && (
        <Modal title="Attendance correction requests" onClose={() => setOpen(false)} width={820}>
          {() => (
            <>
              <div className="seg" role="tablist" aria-label="Filter corrections">
                {[...LEAVE_STATUSES, 'All'].map((s) => (
                  <button key={s} type="button" role="tab" aria-selected={tab === s} className={tab === s ? 'on' : ''} onClick={() => setTab(s)}>
                    {s} <span className="muted small">{s === 'All' ? rows.length : rows.filter((r) => r.status === s).length}</span>
                  </button>
                ))}
              </div>
              <div className="tw" style={{ maxHeight: '60vh', overflow: 'auto' }}><table>
                <thead><tr><th>Employee</th><th>Date</th><th>Requested change</th><th>Reason</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id}>
                      <td>{r.name}</td><td className="nowrap">{longDate(r.day)}</td>
                      <td className="small">{what(r).map((t) => <div key={t}>{t}</div>)}</td>
                      <td className="small" style={{ maxWidth: 220, overflowWrap: 'anywhere' }}>{r.reason}</td>
                      <td><span className={`badge ${LEAVE_BADGE[r.status] || ''}`}>{r.status}</span>
                        {r.status === 'Declined' && r.decline_reason && <div className="small muted" style={{ maxWidth: 200 }}>Reason: {r.decline_reason}</div>}
                        {r.reviewer && <div className="small muted">by {r.reviewer}</div>}</td>
                      <td className="nowrap">{r.status === 'Pending' && <>
                        <button type="button" className="btn sm" disabled={acting === r.id} onClick={() => approve(r)}>{acting === r.id ? <><span className="spin" />Approving…</> : 'Approve'}</button>{' '}
                        <button type="button" className="btn danger sm" disabled={acting === r.id} onClick={() => setDeclining(r)}>Decline</button></>}</td>
                    </tr>
                  ))}
                  {!shown.length && <tr><td colSpan={6} className="empty">{tab === 'Pending' ? 'No pending correction requests. 🎉' : 'Nothing to show.'}</td></tr>}
                </tbody></table></div>
            </>
          )}
        </Modal>
      )}
      {declining && <Decline key={declining.id} r={declining} onClose={() => setDeclining(null)} />}
    </>
  );
}
