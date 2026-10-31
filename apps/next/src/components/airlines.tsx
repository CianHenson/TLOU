'use client';
// Airlines page: list with Add / Edit in a modal and Activate / Deactivate in one click. The active airlines are what the
// Airfare Sales form offers; existing sales keep the airline name they were saved with.
import { useState } from 'react';
import { ApiForm, Field, Submit } from './form';
import { Modal, usePost } from './modal';
import { FootLine } from './ui';

export interface AirlineRow { id: number; name: string; code: string | null; active: number; sales: number; updated_at: string | null; created_at: string }

function AirlineForm({ a, onClose }: { a?: AirlineRow; onClose: () => void }) {
  return (
    <Modal title={a ? 'Edit airline' : 'Add airline'} onClose={onClose} width={480}>
      {(close) => (
        <ApiForm action={a ? `/api/airlines/${a.id}` : '/api/airlines'} stay onDone={(d) => { if (d.ok) close(); }}>
          <Field name="name" label="Airline name *" defaultValue={a?.name} attrs={{ required: true, maxLength: 80, autoFocus: true }} />
          <Field name="code" label="Airline code" defaultValue={a?.code} hint="Optional, e.g. PR or 5J." attrs={{ maxLength: 3, style: { textTransform: 'uppercase' } }} />
          <label className="small" style={{ display: 'block', marginBottom: 12 }}><input type="checkbox" name="active" defaultChecked={a ? !!a.active : true} /> Active — offered when recording new airfare sales</label>
          {a && <p className="small muted">Existing sales keep the airline name they were saved with, even if you rename or deactivate it here.</p>}
          <div className="row"><Submit>{a ? 'Save changes' : 'Add airline'}</Submit> <button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
        </ApiForm>
      )}
    </Modal>
  );
}

export function NewAirlineButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="icon-btn" aria-label="Add airline" title="Add airline" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      {open && <AirlineForm onClose={() => setOpen(false)} />}
    </>
  );
}

export function AirlineTable({ rows, total }: { rows: AirlineRow[]; total: number }) {
  const [edit, setEdit] = useState<AirlineRow | null>(null);
  const { post, busy } = usePost();
  return (
    <div className="tw tw-fixed tw-fm">
      <table><colgroup><col /><col style={{ width: '12%' }} /><col style={{ width: '14%' }} /><col style={{ width: '14%' }} /><col style={{ width: '16%' }} /><col style={{ width: 200 }} /></colgroup>
        <thead><tr><th>Airline</th><th>Code</th><th>Status</th><th className="num">Sales recorded</th><th>Last updated</th><th></th></tr></thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className={a.active ? '' : 'off'} onDoubleClick={() => setEdit(a)}>
              <td><strong>{a.name}</strong></td><td>{a.code || <span className="muted">—</span>}</td>
              <td><span className={`badge ${a.active ? 'b-ok' : 'b-err'}`}>{a.active ? 'Active' : 'Inactive'}</span></td>
              <td className="num">{a.sales}</td><td className="nowrap">{(a.updated_at || a.created_at).slice(0, 10)}</td>
              <td className="num nowrap">
                <button type="button" className="btn ghost sm" onClick={() => setEdit(a)}>Edit</button>{' '}
                <button type="button" className="btn ghost sm" disabled={busy} onClick={() => post(`/api/airlines/${a.id}`, { toggle: '1', active: a.active ? '0' : '1' })}>{a.active ? 'Deactivate' : 'Activate'}</button>
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={6} className="empty">No airlines found. Use the + button to add one.</td></tr>}
          {!!rows.length && <tr className="fill"><td colSpan={6} /></tr>}
        </tbody>
        {!!rows.length && <FootLine cols={6} total={total} />}
      </table>
      {edit && <AirlineForm key={edit.id} a={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}
