'use client';
// Customer Management dialogs: the gold "+" header button opens Add customer in a modal, and the row menu's Edit customer opens
// the same form filled in. Saving closes the dialog and refreshes the table in place (no page change). Windows events let the
// server-rendered table's right-click menu open the dialogs: CUSTOMER_NEW_EVT, CUSTOMER_EDIT_EVT (detail = the customer).
import { useEffect, useState } from 'react';
import { ApiForm, Field, Submit } from './form';
import { Dropdown } from './dropdown';
import { Modal } from './modal';
import { digitsOnly, titleCase } from './input-format';
import { CONTACT_METHODS } from '@/lib/types';

export const CUSTOMER_NEW_EVT = 'customer:new';
export const CUSTOMER_EDIT_EVT = 'customer:edit';

export interface CustomerValues { id: number; name: string; phone: string; email: string; pref_contact: string; notes: string }

function CustomerDialog({ c, onClose }: { c?: CustomerValues; onClose: () => void }) {
  return (
    <Modal title={c ? 'Edit customer' : 'Add customer'} onClose={onClose} width={560}>
      {(close) => (
        <ApiForm action={c ? `/api/customers/${c.id}` : '/api/customers'} stay onDone={(d) => { if (d.ok) close(); }}>
          <Field name="name" label="Full name *" defaultValue={c?.name} attrs={{ required: true, maxLength: 120, autoFocus: true, onInput: titleCase, autoCapitalize: 'words' }} />
          <div className="grid g2">
            <Field name="phone" label="Contact number" type="tel" defaultValue={c?.phone} attrs={{ maxLength: 16, inputMode: 'tel', placeholder: '09171234567', onInput: digitsOnly }} />
            <Field name="email" label="Email" type="email" defaultValue={c?.email} attrs={{ maxLength: 160, placeholder: 'name@example.com' }} />
          </div>
          <div className="field"><label>Preferred contact method</label>
            <Dropdown name="pref_contact" ariaLabel="Preferred contact method" options={[['', '— None —'], ...CONTACT_METHODS]} defaultValue={c?.pref_contact ?? ''} style={{ width: '100%' }} /></div>
          <Field name="notes" label="Notes" type="textarea" defaultValue={c?.notes} attrs={{ maxLength: 2000, rows: 3 }} />
          <p className="small muted" style={{ marginTop: -4 }}>Provide a contact number or an email.</p>
          <div className="row"><Submit>{c ? 'Save changes' : 'Save customer'}</Submit> <button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
        </ApiForm>
      )}
    </Modal>
  );
}

export function CustomerModals() {
  const [dlg, setDlg] = useState<{ c?: CustomerValues; k: number } | null>(null);
  useEffect(() => {
    const add = () => setDlg((d) => ({ k: (d?.k ?? 0) + 1 }));
    const edit = (e: Event) => setDlg((d) => ({ c: (e as CustomEvent<CustomerValues>).detail, k: (d?.k ?? 0) + 1 }));
    window.addEventListener(CUSTOMER_NEW_EVT, add);
    window.addEventListener(CUSTOMER_EDIT_EVT, edit);
    return () => { window.removeEventListener(CUSTOMER_NEW_EVT, add); window.removeEventListener(CUSTOMER_EDIT_EVT, edit); };
  }, []);
  return (
    <>
      <button type="button" className="icon-btn" aria-label="Add customer" title="Add customer" aria-haspopup="dialog" onClick={() => window.dispatchEvent(new Event(CUSTOMER_NEW_EVT))}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      {dlg && <CustomerDialog key={dlg.k} c={dlg.c} onClose={() => setDlg(null)} />}
    </>
  );
}
