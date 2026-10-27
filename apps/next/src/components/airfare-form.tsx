'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ApiForm, Field, Submit } from './form';
import { Dropdown } from './dropdown';
import { DateField, TimeField } from './date-time-picker';
import { digitsOnly, moneyInput, titleCase, withCommas, type InputEv } from './input-format';
import { AIRLINES, CHECKIN_STATUSES } from '@/lib/types';

export interface AirfareValues {
  id?: number; txn_date: string; airline?: string; pnr?: string; pax: number; passenger?: string; contact?: string; email_fb?: string; origin?: string; destination?: string;
  travel_date?: string; travel_time?: string; checkin_status: string; flight_no?: string; total_amount?: string; service_charge?: string; card_fee?: string; remarks?: string;
}

const peso = (n: number) => '₱' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const num = (s: string) => { const n = Number(s.replace(/[₱,\s]/g, '')); return Number.isFinite(n) ? n : 0; };

/**
 * Create / edit form for one airfare sale; shows the airline fare and agency income live as the amounts are typed.
 * As a page it goes back to the list when saved; inside a modal pass `onDone` / `onCancel` and it stays on the page.
 */
export function AirfareForm({ a, today, onDone, onCancel }: { a: AirfareValues; today: string; onDone?: () => void; onCancel?: () => void }) {
  const inModal = !!onCancel;
  const isNew = !a.id;
  const [amt, setAmt] = useState({ total: withCommas(a.total_amount ?? ''), sc: withCommas(a.service_charge ?? ''), fee: withCommas(a.card_fee ?? '') });
  const set = (k: keyof typeof amt) => (e: InputEv) => { moneyInput(e); setAmt({ ...amt, [k]: e.currentTarget.value }); };
  const fare = num(amt.total) - num(amt.sc), income = num(amt.sc) - num(amt.fee);
  return (
    <ApiForm action={isNew ? '/api/airfare' : `/api/airfare/${a.id}`} redirect={inModal ? undefined : '/app/airfare'}
      className={inModal ? undefined : 'card'} style={inModal ? undefined : { maxWidth: 980 }} onDone={(d) => { if (d.ok) onDone?.(); }}>
      {inModal && <input type="hidden" name="stay" value="1" />}
      <h3>Booking</h3>
      <div className="grid g4">
        <DateField name="txn_date" label="Transaction date *" defaultValue={a.txn_date} max={today} today={today} required />
        <Field name="airline" label="Airline name *" defaultValue={a.airline} attrs={{ required: true, maxLength: 80, list: 'airlines' }} />
        <Field name="pnr" label="Airline PNR *" defaultValue={a.pnr} attrs={{ required: true, maxLength: 8, style: { textTransform: 'uppercase' } }} />
        <Field name="flight_no" label="Airline ID / flight no." defaultValue={a.flight_no} attrs={{ maxLength: 40, style: { textTransform: 'uppercase' } }} />
      </div>
      <datalist id="airlines">{AIRLINES.map((x) => <option key={x} value={x} />)}</datalist>
      {isNew && <label className="small" style={{ display: 'block', marginTop: -6, marginBottom: 12 }}><input type="checkbox" name="dup_ok" /> Save even if this PNR is already recorded</label>}

      <h3>Passenger</h3>
      <div className="grid g4">
        <Field name="pax" label="PAX *" type="number" defaultValue={a.pax} attrs={{ min: 1, max: 99, required: true }} />
        <div style={{ gridColumn: 'span 3' }}><Field name="passenger" label="Passenger name(s) *" defaultValue={a.passenger} hint="Separate several passengers with commas."
          attrs={{ required: true, maxLength: 255, onInput: titleCase, autoCapitalize: 'words' }} /></div>
        <Field name="contact" label="Contact number" type="tel" defaultValue={a.contact} attrs={{ maxLength: 16, inputMode: 'tel', placeholder: '09171234567', onInput: digitsOnly }} />
        <div style={{ gridColumn: 'span 3' }}><Field name="email_fb" label="Email address / Facebook account" defaultValue={a.email_fb} attrs={{ maxLength: 160 }} /></div>
      </div>

      <h3>Flight</h3>
      <div className="grid g4">
        <Field name="origin" label="Origin *" defaultValue={a.origin} attrs={{ required: true, maxLength: 80, onInput: titleCase, autoCapitalize: 'words' }} />
        <Field name="destination" label="Destination *" defaultValue={a.destination} attrs={{ required: true, maxLength: 80, onInput: titleCase, autoCapitalize: 'words' }} />
        <DateField name="travel_date" label="Travel date *" defaultValue={a.travel_date} today={today} required />
        <div className="field"><label>Status for check-in</label><Dropdown name="checkin_status" ariaLabel="Status for check-in" options={CHECKIN_STATUSES} defaultValue={a.checkin_status} style={{ width: '100%' }} /></div>
        <div className="span2"><TimeField name="travel_time" label="Travel time" defaultValue={a.travel_time} /></div>
      </div>

      <h3>Amounts</h3>
      <div className="grid g4">
        <Field name="total_amount" label="Total amount (₱) *" defaultValue={amt.total} hint="What the customer pays: airline fare + service charge."
          attrs={{ inputMode: 'decimal', placeholder: '0.00', required: true, onInput: set('total') }} />
        <Field name="service_charge" label="Service charge (₱)" defaultValue={amt.sc} attrs={{ inputMode: 'decimal', placeholder: '0.00', onInput: set('sc') }} />
        <Field name="card_fee" label="Credit / debit card fee (₱)" defaultValue={amt.fee} hint="Portal fee the agency pays. Deducted from income."
          attrs={{ inputMode: 'decimal', placeholder: '0.00', onInput: set('fee') }} />
        <div className="field"><label>Computed</label>
          <div className="small">Airline fare: <strong>{peso(fare)}</strong></div>
          <div className="small">Agency income: <strong style={{ color: income < 0 ? 'var(--err)' : undefined }}>{peso(income)}</strong></div></div>
      </div>
      <Field name="remarks" label="Remarks" type="textarea" defaultValue={a.remarks} attrs={{ maxLength: 1000, rows: 2 }} />
      <div className="row"><Submit>{isNew ? 'Save sale' : 'Save changes'}</Submit> {inModal ? <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button> : <Link className="btn ghost" href="/app/airfare">Cancel</Link>}</div>
    </ApiForm>
  );
}
