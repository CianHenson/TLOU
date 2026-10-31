'use client';
// Payroll Deductions (owner / admin): Add Deduction / Edit in a modal, activate or deactivate in one click, and the change history.
// Percentages are typed in by the owner - nothing is pre-filled - and checked again on the server.
import { useState } from 'react';
import { ApiForm, Field, Submit } from './form';
import { Dropdown } from './dropdown';
import { DateField } from './date-time-picker';
import { Modal, usePost } from './modal';
import { FootLine } from './ui';
import { dt12 } from '@/lib/util';
import { DEDUCTION_BASES, DEDUCTION_KINDS, pct } from '@/lib/deduction-shared';

export interface DeductionItem {
  id: number; name: string; kind: string; basis: string; rate_bp: number; active: number; effective_from: string;
  next_bp: number | null; next_active: number | null; next_from: string | null;
}
export interface HistoryItem { id: number; name: string; rate_bp: number; active: number; effective_from: string; changed_at: string; by_name: string | null }

const addDays = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

function DeductionDialog({ d, today, onClose }: { d?: DeductionItem; today: string; onClose: () => void }) {
  return (
    <Modal title={d ? `Edit deduction — ${d.name}` : 'Add deduction'} onClose={onClose} width={520}>
      {(close) => (
        <ApiForm action={d ? `/api/deductions/${d.id}` : '/api/deductions'} stay onDone={(r) => { if (r.ok) close(); }}>
          <Field name="name" label="Deduction Name *" defaultValue={d?.name} hint="e.g. SSS, PhilHealth, Pag-IBIG, Withholding Tax."
            attrs={{ required: true, maxLength: 80, autoFocus: true, placeholder: 'Deduction name' }} />
          <div className="grid g2">
            <Field name="rate" label="Deduction Percentage (%) *" defaultValue={d ? String(d.rate_bp / 100) : ''} attrs={{ required: true, inputMode: 'decimal', maxLength: 7, placeholder: 'e.g. 5' }} />
            <div className="field"><label>Status *</label>
              <Dropdown name="active" ariaLabel="Status" options={['Active', 'Inactive']} defaultValue={d ? (d.active ? 'Active' : 'Inactive') : 'Active'} style={{ width: '100%' }} /></div>
          </div>
          <DateField name="effective_from" label="Effective from *" defaultValue={today} min={addDays(today, -365)} max={addDays(today, 365)} today={today} required />
          <p className="small muted">Type: {DEDUCTION_KINDS.percent} of {DEDUCTION_BASES.gross.toLowerCase()}. Applies to payroll periods ending on or after the effective date; payroll already generated is never changed. Enter and verify the rate yourself: statutory contributions and withholding tax can have their own brackets, ceilings and rules.</p>
          <div className="row"><Submit>{d ? 'Save changes' : 'Add deduction'}</Submit> <button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
        </ApiForm>
      )}
    </Modal>
  );
}

export function AddDeductionButton({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn" onClick={() => setOpen(true)} aria-haspopup="dialog">
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>Add Deduction
      </button>
      {open && <DeductionDialog today={today} onClose={() => setOpen(false)} />}
    </>
  );
}

export function HistoryButton({ rows }: { rows: HistoryItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn ghost" onClick={() => setOpen(true)} aria-haspopup="dialog">Change history</button>
      {open && (
        <Modal title="Deduction change history" onClose={() => setOpen(false)} width={720}>
          {() => (
            <div className="tw" style={{ maxHeight: '60vh', overflow: 'auto' }}><table>
              <thead><tr><th>Deduction</th><th>Rate</th><th>Status</th><th>Effective from</th><th>Changed</th></tr></thead>
              <tbody>
                {rows.map((h) => (
                  <tr key={h.id}><td><strong>{h.name}</strong></td><td>{pct(h.rate_bp)}</td>
                    <td><span className={`badge ${h.active ? 'b-ok' : 'b-err'}`}>{h.active ? 'Active' : 'Inactive'}</span></td>
                    <td className="nowrap">{h.effective_from}</td><td className="nowrap">{dt12(h.changed_at)}<div className="small muted">{h.by_name || '—'}</div></td></tr>
                ))}
                {!rows.length && <tr><td colSpan={5} className="empty">No changes recorded yet.</td></tr>}
              </tbody></table></div>
          )}
        </Modal>
      )}
    </>
  );
}

export function DeductionTable({ rows, total, today }: { rows: DeductionItem[]; total: number; today: string }) {
  const [edit, setEdit] = useState<DeductionItem | null>(null);
  const { post, busy } = usePost();
  return (
    <div className="tw tw-fixed tw-fm">
      <table><colgroup><col /><col style={{ width: '11%' }} /><col style={{ width: '13%' }} /><col style={{ width: '10%' }} /><col style={{ width: '12%' }} /><col style={{ width: '18%' }} /><col style={{ width: 200 }} /></colgroup>
        <thead><tr><th>Deduction</th><th>Type</th><th>Calculated on</th><th className="num">Percentage</th><th>Status</th><th>Effective from</th><th></th></tr></thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id} className={d.active ? '' : 'off'} onDoubleClick={() => setEdit(d)}>
              <td><strong>{d.name} – {pct(d.rate_bp)}</strong></td>
              <td>{DEDUCTION_KINDS[d.kind] ?? d.kind}</td><td>{DEDUCTION_BASES[d.basis] ?? d.basis}</td>
              <td className="num">{pct(d.rate_bp)}</td>
              <td><span className={`badge ${d.active ? 'b-ok' : 'b-err'}`}>{d.active ? 'Active' : 'Inactive'}</span>
                {d.effective_from > today && <div className="small muted">starts {d.effective_from}</div>}</td>
              <td className="nowrap">{d.effective_from}
                {d.next_from && <div className="small muted">then {d.next_active ? pct(d.next_bp!) : 'inactive'} from {d.next_from}</div>}</td>
              <td className="num nowrap">
                <button type="button" className="btn ghost sm" onClick={() => setEdit(d)}>Edit</button>{' '}
                <button type="button" className="btn ghost sm" disabled={busy} onClick={() => post(`/api/deductions/${d.id}`, { toggle: '1', active: d.active ? '0' : '1' })}>{d.active ? 'Deactivate' : 'Activate'}</button>
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={7} className="empty"><strong>No deductions set up yet.</strong><br /><span className="small muted">Payroll has no deductions until you add them with Add Deduction.</span></td></tr>}
          {!!rows.length && <tr className="fill"><td colSpan={7} /></tr>}
        </tbody>
        {!!rows.length && <FootLine cols={7} total={total} />}
      </table>
      {edit && <DeductionDialog key={edit.id + edit.effective_from} d={edit} today={today} onClose={() => setEdit(null)} />}
    </div>
  );
}
