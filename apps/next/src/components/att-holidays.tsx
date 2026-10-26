'use client';
// Attendance & Payroll → "Holidays" header button (beside Requests): record a holiday (everyone) or a leave day for one
// employee, and remove recent / upcoming entries. Approved employee requests are managed in Requests, not here.
import { useState } from 'react';
import { longDate } from '@/lib/util';
import type { Row } from '@/lib/types';
import { ApiForm, Field, Submit } from './form';
import { Modal, usePost } from './modal';

export function HolidaysButton({ rows, staff }: { rows: Row[]; staff: Row[] }) {
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);
  const { post } = usePost();
  const remove = async (l: Row) => {
    if (!window.confirm(`Remove the ${l.kind.toLowerCase()} on ${longDate(l.day)}${l.name ? ` for ${l.name}` : ''}?`)) return;
    setRemoving(l.id);
    await post(`/api/attendance/leave/${l.id}/delete`);
    setRemoving(null);
  };
  return (
    <>
      <button type="button" className="btn ghost" onClick={() => setOpen(true)}>Holidays</button>
      {open && (
        <Modal title="Holidays & leave" onClose={() => setOpen(false)} width={680}>
          {() => (
            <>
              <ApiForm action="/api/attendance/leave" reset>
                <div className="grid g2">
                  <Field name="kind" label="Type" type="select" emptyLabel={null} options={['Holiday', 'Leave']} />
                  <Field name="day" label="Date *" type="date" attrs={{ required: true }} />
                  <Field name="user_id" label="Employee (for leave)" type="select" emptyLabel="— All (holiday) —" options={staff.map((s) => [s.id, s.name])} />
                  <Field name="note" label="Note" attrs={{ maxLength: 200, placeholder: 'e.g. Bonifacio Day' }} />
                </div>
                <Submit>Save</Submit>
              </ApiForm>
              {/* Entered holidays / leave can only be removed (undone) from here, so the list shows once there is something in it. */}
              {!!rows.length && <><h3>Recent &amp; upcoming</h3>
              <div className="tw" style={{ maxHeight: '40vh', overflow: 'auto' }}><table>
                <thead><tr><th>Date</th><th>Type</th><th>Who</th><th>Note</th><th></th></tr></thead>
                <tbody>
                  {rows.map((l) => (
                    <tr key={l.id}><td className="nowrap">{longDate(l.day)}</td><td>{l.kind}</td><td>{l.name || 'Everyone'}</td><td className="small">{l.note || '—'}</td>
                      <td><button type="button" className="btn ghost sm" disabled={removing === l.id} onClick={() => remove(l)}>{removing === l.id ? <><span className="spin" />Removing…</> : 'Remove'}</button></td></tr>
                  ))}
                </tbody></table></div></>}
            </>
          )}
        </Modal>
      )}
    </>
  );
}
