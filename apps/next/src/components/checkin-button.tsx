'use client';
import { ShellPortal } from './shell-portal';
import { useRef } from 'react';
import { ApiForm, Submit } from './form';
import { Dropdown } from './dropdown';
import { CHECKIN_STATUSES, type Row } from '@/lib/types';
import { hm12 } from '@/lib/util';

const fmtDate = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', timeZone: 'UTC' });

/**
 * Header button "Check-ins (n)" that opens a modal listing flights in the next 48 h still marked Pending, with a quick
 * status change per row. Uses <dialog> so the modal sits in the top layer (outside the glass header's backdrop-filter).
 */
export function CheckinButton({ rows }: { rows: Row[] }) {
  const dlg = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button type="button" className="btn ghost" onClick={() => dlg.current?.showModal()}>
        Check-ins <span className={`badge ${rows.length ? 'b-err' : ''}`} style={{ marginLeft: 6 }}>{rows.length}</span>
      </button>
      <ShellPortal>
      <dialog ref={dlg} className="modal narrow" aria-labelledby="ck-title" onClick={(e) => { if (e.target === dlg.current) dlg.current.close(); }}>
        <div className="modal-head">
          <h3 id="ck-title">Needs check-in · next 48 hours <span className="muted small">({rows.length})</span></h3>
          <button type="button" className="modal-x" aria-label="Close" onClick={() => dlg.current?.close()}>×</button>
        </div>
        <div className="modal-body">
          {!rows.length && <p className="muted" style={{ margin: 0 }}>No pending check-ins in the next 48 hours.</p>}
          {!!rows.length && <div className="tw"><table><thead><tr><th>Flight</th><th>Passenger</th><th>Route</th><th>PNR</th><th>Contact</th><th>Check-in</th></tr></thead><tbody>
            {rows.map((r) => (
              <tr key={r.id}><td className="nowrap"><strong>{fmtDate(r.travel_date)} {hm12(r.travel_time)}</strong><div className="small muted">{r.airline} {r.flight_no}</div></td>
                <td>{r.passenger}<div className="small muted">{r.pax} pax</div></td><td>{r.origin} → {r.destination}</td><td>{r.pnr}</td><td>{r.contact}</td>
                <td><ApiForm action={`/api/airfare/${r.id}/status`} className="row" style={{ flexWrap: 'nowrap' }}>
                  <Dropdown name="status" ariaLabel="Check-in status" defaultValue={r.checkin_status} options={CHECKIN_STATUSES} className="sm" style={{ width: 130 }} />
                  <Submit className="btn ghost sm">Set</Submit>
                </ApiForm></td></tr>
            ))}</tbody></table></div>}
        </div>
      </dialog>
      </ShellPortal>
    </>
  );
}
