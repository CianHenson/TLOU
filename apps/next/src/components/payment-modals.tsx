'use client';
// Payments & Transactions dialogs, built like the Airfare Sales ones: the gold "+" header button opens "Record payment" in a
// modal, and a row's View button (or right-click -> View details) opens the read-only details. Windows events let the
// server-rendered table's right-click menu open them: PAYMENT_NEW_EVT, PAYMENT_VIEW_EVT (detail = the payment).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ApiForm, Field, Submit, useFormState } from './form';
import { Dropdown } from './dropdown';
import { DateField } from './date-time-picker';
import { Modal } from './modal';
import { moneyInput } from './input-format';
import { METHODS } from '@/lib/types';
import { dt12, longDate, peso } from '@/lib/util';

export const PAYMENT_NEW_EVT = 'payment:new';
export const PAYMENT_VIEW_EVT = 'payment:view';

export interface BookingOpt { id: number; ref: string; customer: string; status: string; balance: number; paid: number }
export interface PaymentView {
  id: number; ref: string; paid_at: string; kind: string; status: string; amount: number; method: string; reference: string; remarks: string;
  customer: string; customer_id: number; booking_ref: string; recorder: string; created_at: string; reversed_reason: string;
}

export const KIND_BADGE: Record<string, string> = { Payment: 'b-ok', Refund: 'b-warn' };
export const STATUS_BADGE: Record<string, string> = { Valid: 'b-ok', Reversed: 'b-err' };

function NewPayment({ bookings, today, onClose }: { bookings: BookingOpt[]; today: string; onClose: () => void }) {
  const [bk, setBk] = useState('');
  const sel = bookings.find((b) => String(b.id) === bk);
  return (
    <Modal title="Record payment" onClose={onClose} width={620}>
      {(close) => bookings.length ? (
        <ApiForm action="/api/payments" stay onDone={(d) => { if (d.ok) close(); }}>
          <BookingField bookings={bookings} value={bk} onChange={setBk} />
          {sel && <p className="small muted" style={{ marginTop: -6 }}>Paid so far <strong>{peso(sel.paid)}</strong> · Balance <strong>{peso(sel.balance)}</strong> · {sel.status}</p>}
          <div className="grid g2">
            <div className="field"><label>Type *</label><Dropdown name="kind" ariaLabel="Type" options={['Payment', 'Refund']} defaultValue="Payment" style={{ width: '100%' }} /></div>
            <DateField name="paid_at" label="Date *" defaultValue={today} max={today} today={today} required />
            <Field name="amount" label="Amount (₱) *" attrs={{ inputMode: 'decimal', placeholder: '0.00', required: true, onInput: moneyInput }} />
            <div className="field"><label>Payment method *</label><Dropdown name="method" ariaLabel="Payment method" options={METHODS} defaultValue={METHODS[0]} style={{ width: '100%' }} /></div>
          </div>
          <Field name="reference" label="Reference no." attrs={{ maxLength: 80, placeholder: 'e.g. GCash ref. or receipt no.' }} />
          <Field name="remarks" label="Remarks" type="textarea" attrs={{ maxLength: 500, rows: 2 }} />
          <div className="row"><Submit>Save payment</Submit> <button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
        </ApiForm>
      ) : (
        <div className="empty-state"><p><strong>No bookings to record a payment against.</strong></p><button type="button" className="btn ghost" onClick={close}>Close</button></div>
      )}
    </Modal>
  );
}

/** Booking dropdown that also shows the server's error for `booking_id`. */
function BookingField({ bookings, value, onChange }: { bookings: BookingOpt[]; value: string; onChange: (v: string) => void }) {
  const e = useFormState().errors.booking_id;
  return (
    <div className={`field ${e ? 'has-err' : ''}`}><label>Booking *</label>
      <Dropdown name="booking_id" ariaLabel="Booking" value={value} onChange={onChange} style={{ width: '100%' }}
        options={[['', '— Choose a booking —'], ...bookings.map((b): [string, string] => [String(b.id), `${b.ref} · ${b.customer}${b.status === 'Cancelled' ? ' (cancelled)' : ''}`])]} />
      {e && <div className="err" role="alert">{e}</div>}</div>
  );
}

function Details({ p, onClose }: { p: PaymentView; onClose: () => void }) {
  return (
    <Modal title={`${p.kind} ${p.ref}`} onClose={onClose} width={520}>
      {(close) => (
        <>
          <dl className="kv pay-kv">
            <dt>Status</dt><dd><span className={`badge ${STATUS_BADGE[p.status] ?? ''}`}>{p.status}</span></dd>
            <dt>Type</dt><dd><span className={`badge ${KIND_BADGE[p.kind] ?? ''}`}>{p.kind}</span></dd>
            <dt>Amount</dt><dd><strong>{p.kind === 'Refund' ? '−' : ''}{peso(p.amount)}</strong></dd>
            <dt>Date</dt><dd>{longDate(p.paid_at)}</dd>
            <dt>Customer</dt><dd><Link href={`/app/customers/${p.customer_id}`}>{p.customer}</Link></dd>
            <dt>Booking</dt><dd>{p.booking_ref}</dd>
            <dt>Method</dt><dd>{p.method}</dd>
            <dt>Reference</dt><dd>{p.reference || '—'}</dd>
            <dt>Recorded by</dt><dd>{p.recorder || '—'} <span className="muted small">· {dt12(p.created_at)}</span></dd>
            {p.remarks && <><dt>Remarks</dt><dd>{p.remarks}</dd></>}
            {p.status === 'Reversed' && <><dt>Reversed because</dt><dd>{p.reversed_reason || '—'}</dd></>}
          </dl>
          <div className="row"><button type="button" className="btn ghost" onClick={close}>Close</button></div>
        </>
      )}
    </Modal>
  );
}

export function PaymentModals({ bookings, today }: { bookings: BookingOpt[]; today: string }) {
  const [dlg, setDlg] = useState<{ view?: PaymentView; k: number } | null>(null);
  useEffect(() => {
    const add = () => setDlg((d) => ({ k: (d?.k ?? 0) + 1 }));
    const view = (e: Event) => setDlg((d) => ({ view: (e as CustomEvent<PaymentView>).detail, k: (d?.k ?? 0) + 1 }));
    window.addEventListener(PAYMENT_NEW_EVT, add);
    window.addEventListener(PAYMENT_VIEW_EVT, view);
    return () => { window.removeEventListener(PAYMENT_NEW_EVT, add); window.removeEventListener(PAYMENT_VIEW_EVT, view); };
  }, []);
  return (
    <>
      <button type="button" className="icon-btn" aria-label="Record payment" title="Record payment" aria-haspopup="dialog" onClick={() => window.dispatchEvent(new Event(PAYMENT_NEW_EVT))}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      {dlg && (dlg.view ? <Details key={dlg.k} p={dlg.view} onClose={() => setDlg(null)} /> : <NewPayment key={dlg.k} bookings={bookings} today={today} onClose={() => setDlg(null)} />)}
    </>
  );
}

/** "View" button in a table row. */
export function ViewPayment({ p }: { p: PaymentView }) {
  return <button type="button" className="btn ghost sm" onClick={() => window.dispatchEvent(new CustomEvent(PAYMENT_VIEW_EVT, { detail: p }))}>View</button>;
}
