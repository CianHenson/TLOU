// Booking create/edit form (views/app/booking-form.ejs). Server component composing the client ApiForm/Field.
import Link from 'next/link';
import { ApiForm, Field, Submit } from './form';
import { SERVICE_TYPES, BOOKING_STATUSES } from '@/lib/types';

type V = Record<string, string | number | null | undefined>;

export function BookingForm({ v, id, customers, staff, customerLink }: {
  v: V; id?: number;
  customers: { id: number; code: string; name: string }[]; staff: { id: number; name: string }[];
  /** Edit mode: customer shown as a link instead of a select. */
  customerLink?: { id: number; name: string };
}) {
  return (
    <ApiForm action={id ? `/api/bookings/${id}` : '/api/bookings'} className="card" style={{ maxWidth: 820 }}>
      <input type="hidden" name="request_id" value={v.request_id ?? ''} />
      <div className="grid g2">
        {!customerLink
          ? <Field name="customer_id" label="Customer *" type="select" options={customers.map((c) => [c.id, `${c.code} — ${c.name}`] as [number, string])} defaultValue={v.customer_id} />
          : <div className="field"><label>Customer</label><div><Link href={`/app/customers/${customerLink.id}`}>{customerLink.name}</Link></div></div>}
        <Field name="service_type" label="Service type *" type="select" options={SERVICE_TYPES} defaultValue={v.service_type} />
        <Field name="supplier" label="Supplier / booking provider" defaultValue={v.supplier} attrs={{ maxLength: 160 }} />
        <Field name="status" label="Booking status *" type="select" options={BOOKING_STATUSES} defaultValue={v.status} hint="Quoted → Confirmed → Completed. Only Confirmed/Completed count as confirmed sales." />
      </div>
      <Field name="details" label="Travel / reservation details" type="textarea" defaultValue={v.details} />
      <div className="grid g4">
        <Field name="supplier_cost" label="Supplier cost (₱)" type="number" defaultValue={v.supplier_cost} attrs={{ step: '0.01', min: 0 }} />
        <Field name="selling_price" label="Selling price (₱)" type="number" defaultValue={v.selling_price} attrs={{ step: '0.01', min: 0 }} />
        <Field name="service_fee" label="Service fee / markup (₱)" type="number" defaultValue={v.service_fee} attrs={{ step: '0.01', min: 0 }} />
        <Field name="discount" label="Discount (₱)" type="number" defaultValue={v.discount} attrs={{ step: '0.01', min: 0 }} />
      </div>
      <p className="muted small">Total payable = selling price + service fee − discount. Margin = total payable − supplier cost.</p>
      <div className="grid g2">
        <Field name="confirmation_ref" label="Booking confirmation / ticket reference" defaultValue={v.confirmation_ref} attrs={{ maxLength: 80 }} />
        <Field name="assigned_to" label="Assigned employee" type="select" options={staff.map((s) => [s.id, s.name] as [number, string])} defaultValue={v.assigned_to} />
      </div>
      <Field name="remarks" label="Remarks" type="textarea" defaultValue={v.remarks} />
      <Submit>Save booking</Submit> <Link className="btn ghost" href={id ? `/app/bookings/${id}` : '/app/bookings'}>Cancel</Link>
    </ApiForm>
  );
}
