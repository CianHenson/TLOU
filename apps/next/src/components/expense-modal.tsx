'use client';
import { useEffect, useRef, useState } from 'react';
import { ApiForm, Field, Submit } from './form';
import { Dropdown } from './dropdown';
import { DateField } from './date-time-picker';
import { moneyInput } from './input-format';
import { ShellPortal } from './shell-portal';
import { EXPENSE_CATS, METHODS } from '@/lib/types';

/** Window event that opens the Record expense dialog (the Monitoring Finances table's empty-space menu sends it). */
export const NEW_EXPENSE_EVT = 'expense:new';

/**
 * Gold "+" header button (Expenses, Monitoring Finances) that opens the Add expense form in a modal. Posts to /api/expenses
 * like the Expenses page; on save the dialog closes, the sheet refreshes and the form is remounted empty.
 */
export function ExpenseModalButton({ today }: { today: string }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [k, setK] = useState(0);
  const close = () => dlg.current?.close();
  useEffect(() => {
    const open = () => dlg.current?.showModal();
    window.addEventListener(NEW_EXPENSE_EVT, open);
    return () => window.removeEventListener(NEW_EXPENSE_EVT, open);
  }, []);
  return (
    <>
      <button type="button" className="icon-btn" aria-label="Add expense" title="Add expense" aria-haspopup="dialog" onClick={() => dlg.current?.showModal()}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      <ShellPortal>
        <dialog ref={dlg} className="modal wide" style={{ width: 'min(620px, calc(100vw - 32px))' }} aria-labelledby="ex-title" onClick={(e) => { if (e.target === dlg.current) close(); }}>
          <div className="modal-head">
            <h3 id="ex-title">Add expense</h3>
            <button type="button" className="modal-x" aria-label="Close" onClick={close}>×</button>
          </div>
          <div className="modal-body">
            <ApiForm key={k} action="/api/expenses" onDone={(d) => { if (d.ok) { close(); setK((n) => n + 1); } }}>
              <div className="grid g2">
                <DateField name="spent_at" label="Date *" defaultValue={today} max={today} today={today} required />
                <Field name="amount" label="Amount (₱) *" attrs={{ inputMode: 'decimal', placeholder: '0.00', required: true, onInput: moneyInput }} />
                <div className="field"><label>Category *</label><Dropdown name="category" ariaLabel="Category" options={EXPENSE_CATS} defaultValue={EXPENSE_CATS[0]} style={{ width: '100%' }} /></div>
                <div className="field"><label>Payment method *</label><Dropdown name="method" ariaLabel="Payment method" options={METHODS} defaultValue={METHODS[0]} style={{ width: '100%' }} /></div>
              </div>
              <Field name="description" label="Description *" attrs={{ maxLength: 500, required: true }} />
              <div className="field"><label htmlFor="ex-receipt">Receipt (PDF/JPG/PNG, max 5 MB)</label><input id="ex-receipt" type="file" name="receipt" accept=".pdf,.jpg,.jpeg,.png" /></div>
              <div className="row"><Submit>Save expense</Submit> <button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
            </ApiForm>
          </div>
        </dialog>
      </ShellPortal>
    </>
  );
}
