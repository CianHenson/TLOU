'use client';
import Link from 'next/link';
import { useState } from 'react';
import { ApiForm, Field, Submit } from '@/components/form';
import { FlashBar } from '@/components/flash';
import { GROUPS } from '@/lib/forms';
import { CONTACT_METHODS, SERVICE_TYPES } from '@/lib/types';
import { Consent, Honeypot } from './contact-form';

/** Show/hide the fields of the chosen service and the round-trip-only return date (was public/app.js). */
export function RequestForm({ init }: { init: { service_type: string; d_origin?: string; d_destination?: string; d_trip_type?: string } }) {
  const [svc, setSvc] = useState(init.service_type);
  const [trip, setTrip] = useState(init.d_trip_type ?? '');
  const initial = init as Record<string, string | undefined>;
  return (
    <ApiForm action="/api/public/request">
      <FlashBar />
      <Honeypot />
      <div className="card" style={{ marginTop: 18 }}><h2>Your details</h2>
        <div className="grid g2">
          <Field name="name" label="Full name *" attrs={{ required: true, maxLength: 120, autoComplete: 'name' }} />
          <Field name="phone" label="Contact number *" type="tel" attrs={{ required: true, maxLength: 20, autoComplete: 'tel' }} />
          <Field name="email" label="Email address *" type="email" attrs={{ required: true, maxLength: 160, autoComplete: 'email' }} />
          <Field name="pref_contact" label="Preferred contact method *" type="select" options={CONTACT_METHODS} attrs={{ required: true }} />
        </div>
      </div>
      <div className="card"><h2>What do you need?</h2>
        <Field name="service_type" label="Service *" type="select" options={SERVICE_TYPES} defaultValue={init.service_type}
          attrs={{ required: true, onChange: (e) => setSvc(e.currentTarget.value) }} />
        {Object.entries(GROUPS).map(([key, g]) => {
          const on = g.types.includes(svc);
          return (
            <div key={key} hidden={!on}>
              <div className="grid g2">
                {g.fields.map((f) => {
                  const hide = !on || (!!f.when && trip !== f.when);
                  const attrs = {
                    ...(f.required ? { required: true } : {}), ...(f.min != null ? { min: f.min } : {}), ...(f.max != null ? { max: f.max } : {}),
                    disabled: hide,
                    ...(f.k === 'trip_type' ? { onChange: (e: React.ChangeEvent<HTMLInputElement>) => setTrip(e.currentTarget.value) } : {}),
                  };
                  return (
                    <div key={f.k} hidden={hide} style={f.type === 'textarea' ? { gridColumn: '1/-1' } : undefined}>
                      <Field name={'d_' + f.k} label={f.label + (f.required ? ' *' : '')} type={f.type} options={f.options || []}
                        defaultValue={initial['d_' + f.k]} attrs={attrs} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
      <div className="card">
        <Consent>I have read and agree to the <Link href="/privacy" target="_blank">privacy notice</Link> and consent to my details being used to process this request. *</Consent>
        <Submit className="btn alt big">Submit request</Submit>
      </div>
    </ApiForm>
  );
}
