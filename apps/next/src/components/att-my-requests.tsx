'use client';
// My Attendance header buttons. "My day-off requests" opens a modal listing the employee's requests; its "Request Day Off"
// button hides that list and opens the request form, and Cancel (or a sent request) brings the list back. "My Payslip" opens
// a modal with the employee's payslips.
import { useState } from 'react';
import Link from 'next/link';
import { LEAVE_BADGE, LEAVE_KINDS, type Row } from '@/lib/types';
import { hrs, longDate, peso } from '@/lib/util';
import { pct } from '@/lib/deduction-shared';
import { ApiForm, Field, Submit } from './form';
import { Modal } from './modal';

const span = (a: string, b: string) => (a === b ? longDate(a) : `${longDate(a)} – ${longDate(b)}`);

function RequestForm({ today, onClose }: { today: string; onClose: () => void }) {
  const [from, setFrom] = useState(today);
  return (
    <Modal title="Request a Day Off" onClose={onClose} width={560}>
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
  );
}

export function MyRequestsButton({ requests, canRequest, today }: { requests: Row[]; canRequest: boolean; today: string }) {
  const [view, setView] = useState<null | 'list' | 'new'>(null);
  return (
    <>
      <button type="button" className="btn ghost" onClick={() => setView('list')} aria-haspopup="dialog">Day-off requests</button>
      {view && (
        <Modal title="My day-off requests" onClose={() => setView(null)} width={720} hidden={view === 'new'}>
          {() => (
            <>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span className="small muted">{canRequest ? 'Your latest requests and their status.' : 'You are not set up in attendance monitoring yet, so you cannot file requests. Please ask the owner or an admin.'}</span>
                {canRequest && !!requests.length && <button type="button" className="btn" onClick={() => setView('new')}>Request a Day Off</button>}
              </div>
              <div className="tw" style={{ maxHeight: '60vh', overflow: 'auto' }}><table>
                <thead><tr><th>Type</th><th>Date(s)</th><th>Status</th></tr></thead>
                <tbody>
                  {requests.map((r) => (
                    <tr key={r.id}><td>{r.kind}<div className="small muted" style={{ overflowWrap: 'anywhere' }}>{r.reason}</div></td><td className="nowrap">{span(r.from_day, r.to_day)}</td>
                      <td><span className={`badge ${LEAVE_BADGE[r.status] || ''}`}>{r.status}</span>
                        {r.status === 'Declined' && r.decline_reason && <div className="small"><strong>Reason:</strong> {r.decline_reason}</div>}</td></tr>
                  ))}
                  {!requests.length && <tr><td colSpan={3} className="empty">
                    <strong>No requests yet.</strong>
                    {canRequest
                      ? <div style={{ marginTop: 12 }}><button type="button" className="btn" onClick={() => setView('new')}>Request a Day Off</button></div>
                      : <div className="small muted">Your account is not set up for attendance yet, so you cannot file requests. Please ask the owner or an admin.</div>}
                  </td></tr>}
                </tbody></table></div>
            </>
          )}
        </Modal>
      )}
      {view === 'new' && <RequestForm today={today} onClose={() => setView('list')} />}
    </>
  );
}

/** Payslips whose period overlaps the dates applied in the date menu above the table. */
export function MyPayslipsButton({ payslips, from, to, deductions }: { payslips: Row[]; from: string; to: string; deductions: { id: number; name: string; rate_bp: number }[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn ghost" onClick={() => setOpen(true)} aria-haspopup="dialog">My Payslip</button>
      {open && (
        <Modal title="My payslip" onClose={() => setOpen(false)} width={680}>
          {() => (
            <>
            <p className="small muted" style={{ marginTop: 0 }}>Payslips for {span(from, to)}.</p>
            <div className="ded-box" style={{ marginBottom: 12 }}>
              <strong>Deductions currently applied to payroll</strong>
              {deductions.length
                ? <ul>{deductions.map((d) => <li key={d.id}>{d.name} – {pct(d.rate_bp)} <span className="muted">of gross salary</span></li>)}</ul>
                : <p className="small muted" style={{ margin: '4px 0 0' }}>No deductions are set up.</p>}
              <p className="small muted" style={{ margin: '6px 0 0' }}>Open a payslip to see the peso amount of each deduction. Only the owner or an admin can change these.</p>
            </div>
            <div className="tw" style={{ maxHeight: '60vh', overflow: 'auto' }}><table>
              <thead><tr><th>Period</th><th className="num">Hours</th><th className="num">Gross</th><th className="num">Deductions</th><th className="num">Net pay</th><th></th></tr></thead>
              <tbody>
                {payslips.map((p) => (
                  <tr key={p.id}><td>{span(p.period_from, p.period_to)}<div className="small muted">{p.period_kind} · {p.days} days</div></td>
                    <td className="num">{hrs(p.minutes)}</td><td className="num">{peso(p.gross_pay ?? p.basic_pay + p.adjustments)}</td><td className="num">{p.total_deductions ? '− ' + peso(p.total_deductions) : '—'}</td><td className="num"><strong>{peso(p.net_pay)}</strong></td><td><Link href={`/app/payslip/${p.id}`}>View</Link></td></tr>
                ))}
                {!payslips.length && <tr><td colSpan={6} className="empty">No payslip generated for these dates yet. Change the dates above to see others.</td></tr>}
              </tbody></table></div>
            </>
          )}
        </Modal>
      )}
    </>
  );
}
