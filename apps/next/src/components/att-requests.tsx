'use client';
// Attendance Monitoring → "Requests" header button (like Airfare's Check-ins): a modal listing employee day-off requests,
// filterable by status. Pending ones can be approved, or declined through a second dialog that requires a reason the
// employee will see.
import { useState } from 'react';
import { longDate } from '@/lib/util';
import { LEAVE_BADGE, LEAVE_STATUSES, type Row } from '@/lib/types';
import { ApiForm, Field, Submit } from './form';
import { Modal, usePost } from './modal';
import { KebabMenu } from './kebab-menu';

const dates = (r: Row) => (r.from_day === r.to_day ? longDate(r.from_day) : `${longDate(r.from_day)} – ${longDate(r.to_day)}`);

function Decline({ r, onClose }: { r: Row; onClose: () => void }) {
  return (
    <Modal title={`Decline request — ${r.name}`} onClose={onClose} width={520}>
      {(close) => (
        <ApiForm action={`/api/attendance/requests/${r.id}/review`} stay onDone={(d) => { if (d.ok) close(); }}>
          <input type="hidden" name="action" value="decline" />
          <p className="small muted" style={{ marginTop: 0 }}>{r.kind} · {dates(r)}. {r.name} will see this reason.</p>
          <Field name="decline_reason" label="Reason for declining *" type="textarea" attrs={{ required: true, maxLength: 1000, rows: 3, placeholder: 'e.g. Short-staffed that week; please choose another date' }} />
          <div className="row"><Submit className="btn danger">Decline request</Submit> <button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
        </ApiForm>
      )}
    </Modal>
  );
}

export function RequestsButton({ rows }: { rows: Row[] }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState('Pending');
  const [declining, setDeclining] = useState<Row | null>(null);
  const [acting, setActing] = useState<number | null>(null);
  const { post } = usePost();
  const pending = rows.filter((r) => r.status === 'Pending').length;
  const shown = tab === 'All' ? rows : rows.filter((r) => r.status === tab);
  const approve = async (r: Row) => {
    if (!window.confirm(`Approve ${r.name}'s ${r.kind.toLowerCase()} for ${dates(r)}? Those workdays will show as approved leave, not absences.`)) return;
    setActing(r.id);
    await post(`/api/attendance/requests/${r.id}/review`, { action: 'approve' });
    setActing(null);
  };
  return (
    <>
      <button type="button" className="btn ghost" onClick={() => setOpen(true)}>
        Requests <span className={`badge ${pending ? 'b-warn' : ''}`} style={{ marginLeft: 6 }}>{pending}</span>
      </button>
      {open && (
        <Modal title="Employee requests" onClose={() => setOpen(false)} width={900}>
          {() => (
            <>
              <div className="seg" role="tablist" aria-label="Filter requests">
                {[...LEAVE_STATUSES, 'All'].map((s) => (
                  <button key={s} type="button" role="tab" aria-selected={tab === s} className={tab === s ? 'on' : ''} onClick={() => setTab(s)}>
                    {s} <span className="muted small">{s === 'All' ? rows.length : rows.filter((r) => r.status === s).length}</span>
                  </button>
                ))}
              </div>
              <div className="tw" style={{ maxHeight: '60vh', overflow: 'auto' }}><table><colgroup><col /><col /><col /><col style={{ width: '24%' }} /><col /><col /><col style={{ width: 52 }} /></colgroup>
                <thead><tr><th>Employee</th><th>Type</th><th>Date(s)</th><th>Reason / details</th><th>Filed</th><th>Status</th><th></th></tr></thead>
                <tbody>
                  {shown.map((r) => (
                    <tr key={r.id}>
                      <td className="nowrap">{r.name}</td><td className="nowrap">{r.kind}</td><td className="nowrap">{dates(r)}</td>
                      <td className="small" style={{ maxWidth: 200, overflowWrap: 'anywhere' }}>{r.reason}</td>
                      <td className="nowrap small">{longDate(r.created_at.slice(0, 10))}</td>
                      <td><span className={`badge ${LEAVE_BADGE[r.status] || ''}`}>{r.status}</span>
                        {r.status === 'Declined' && r.decline_reason && <div className="small muted" style={{ maxWidth: 220 }}>Reason: {r.decline_reason}</div>}
                        {r.reviewer && <div className="small muted">by {r.reviewer}</div>}</td>
                      <td className="nowrap" style={{ textAlign: 'right' }}>{r.status === 'Pending' && (acting === r.id ? <span className="spin" aria-label="Working" /> : (
                        <KebabMenu label={`Actions for ${r.name}`} items={[{ label: 'Approve', onClick: () => approve(r) }, { label: 'Decline…', danger: true, onClick: () => setDeclining(r) }]} />))}</td>
                    </tr>
                  ))}
                  {!shown.length && <tr><td colSpan={7} className="empty">{tab === 'Pending' ? 'No pending requests. 🎉' : `No ${tab === 'All' ? '' : tab.toLowerCase() + ' '}requests in the last 120 days.`}</td></tr>}
                </tbody></table></div>
            </>
          )}
        </Modal>
      )}
      {declining && <Decline key={declining.id} r={declining} onClose={() => setDeclining(null)} />}
    </>
  );
}
