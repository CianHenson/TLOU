// Customer create/edit form (views/app/customer-form.ejs). Posts to /api/customers or /api/customers/[id].
import Link from 'next/link';
import { ApiForm, Field, Submit } from './form';
import { CONTACT_METHODS } from '@/lib/types';

export function CustomerForm({ c }: { c?: { id: number; name: string; phone: string; email: string; pref_contact: string; notes: string } }) {
  return (
    <ApiForm action={c ? `/api/customers/${c.id}` : '/api/customers'} className="card" style={{ maxWidth: 640 }}>
      <Field name="name" label="Full name *" defaultValue={c?.name} attrs={{ required: true, maxLength: 120 }} />
      <div className="grid g2">
        <Field name="phone" label="Contact number" defaultValue={c?.phone} attrs={{ maxLength: 40 }} />
        <Field name="email" label="Email" type="email" defaultValue={c?.email} attrs={{ maxLength: 160 }} />
      </div>
      <Field name="pref_contact" label="Preferred contact method" type="select" options={CONTACT_METHODS} defaultValue={c?.pref_contact} />
      <Field name="notes" label="Notes" type="textarea" defaultValue={c?.notes} />
      <Submit>Save customer</Submit> <Link className="btn ghost" href={c ? `/app/customers/${c.id}` : '/app/customers'}>Cancel</Link>
    </ApiForm>
  );
}
