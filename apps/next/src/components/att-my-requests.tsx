'use client';
// My Attendance → "Request day off" header button: an employee files a day-off / leave request for themself.
import { useState } from 'react';
import { LEAVE_KINDS } from '@/lib/types';
import { ApiForm, Field, Submit } from './form';
import { Modal } from './modal';

export function RequestDayOffButton({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  const [from, setFrom] = useState(today);
  return (
    <>
      <button type="button" className="btn" onClick={() => setOpen(true)}>Request day off</button>
      {open && (
        <Modal title="Request a day off" onClose={() => setOpen(false)} width={560}>
          {(close) => (
            <ApiForm action="/api/attendance/requests" stay onDone={(d) => { if (d.ok) close(); }}>
              <Field name="kind" label="Type *" type="select" emptyLabel={null} options={LEAVE_KINDS} />
              <div className="grid g2">
                <div className="field"><label htmlFor="rq-from">From *</label><input id="rq-from" type="date" name="from_day" required value={from} onChange={(e) => setFrom(e.target.value)} /></div>
                <Field name="to_day" label="To" type="date" attrs={{ min: from }} hint="Leave blank for a single day." />
              </div>
              <Field name="reason" label="Reason / details *" type="textarea" attrs={{ required: true, maxLength: 1000, rows: 3 }} />
              <p className="small muted">The owner or an admin will approve or decline it. Approved days show as approved leave in your attendance.</p>
              <div className="row"><Submit>Send request</Submit> <button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
            </ApiForm>
          )}
        </Modal>
      )}
    </>
  );
}
