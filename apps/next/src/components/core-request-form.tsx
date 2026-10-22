'use client';
// Staff "Register request" form (views/app/request-new.ejs + the show-only-chosen-service behaviour of public/app.js).
import { useState } from 'react';
import Link from 'next/link';
import { ApiForm, Field, Submit } from './form';
import { GROUPS } from '@/lib/forms';
import { SERVICE_TYPES, REQUEST_SOURCES } from '@/lib/types';

export function RequestForm({ customers, customerId }: { customers: { id: number; code: string; name: string }[]; customerId?: string }) {
  const [service, setService] = useState('');
  const [trip, setTrip] = useState('');
  const group = Object.values(GROUPS).find((g) => g.types.includes(service));
  return (
    <ApiForm action="/api/requests" className="card" style={{ maxWidth: 780 }}>
      <p className="muted">Register a request received by walk-in, phone, email or social media. <Link href="/app/customers/new">Create the customer first</Link> if they are new.</p>
      <div className="grid g2">
        <Field name="customer_id" label="Customer *" type="select" options={customers.map((c) => [c.id, `${c.code} — ${c.name}`] as [number, string])} defaultValue={customerId} />
        <Field name="source" label="Channel *" type="select" options={REQUEST_SOURCES} />
      </div>
      <Field name="service_type" label="Service *" type="select" options={SERVICE_TYPES} attrs={{ onChange: (e: React.ChangeEvent<HTMLInputElement>) => { setService(e.target.value); setTrip(''); } }} />
      {group && (
        <div className="grid g2" key={service}>
          {group.fields.map((f) => {
            if (f.when && trip !== f.when) return null;
            const attrs = f.min != null ? { min: f.min } : {};
            const onChange = f.k === 'trip_type' ? { onChange: (e: React.ChangeEvent<HTMLInputElement>) => setTrip(e.target.value) } : {};
            return (
              <div key={f.k} style={f.type === 'textarea' ? { gridColumn: '1/-1' } : undefined}>
                <Field name={'d_' + f.k} label={f.label + (f.required ? ' *' : '')} type={f.type} options={f.options || []} attrs={{ ...attrs, ...onChange }} />
              </div>
            );
          })}
        </div>
      )}
      <Submit>Register request</Submit> <Link className="btn ghost" href="/app/requests">Cancel</Link>
    </ApiForm>
  );
}
