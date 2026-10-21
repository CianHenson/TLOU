import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { post } from '../../lib/api';
import { useForm } from '../../lib/form';
import { useFormSchema } from '../../lib/site';
import Field, { CheckField } from '../../ui/Field';

export function RequestForm() {
  const { data: schema } = useFormSchema();
  const [sp] = useSearchParams();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  // Deep links from the home page: ?service=..&origin=..&destination=.. (promo fares prefill the route).
  const service = schema?.serviceTypes.includes(sp.get('service') ?? '') ? sp.get('service')! : '';
  const origin = sp.get('origin')?.slice(0, 80) ?? '';
  const destination = sp.get('destination')?.slice(0, 80) ?? '';
  const f = useForm<Record<string, string | boolean>>({
    name: '', phone: '', email: '', pref_contact: '', service_type: service, consent: false, website: '',
    ...(origin || destination ? { d_origin: origin, d_destination: destination, d_trip_type: 'One-way' } : {}),
  });

  if (!schema) return null;
  const group = Object.values(schema.groups).find((g) => g.types.includes(String(f.v.service_type)));
  const visible = (group?.fields ?? []).filter((fd) => !fd.when || f.v.d_trip_type === fd.when);
  const set = (k: string) => (val: string) => f.setV((p) => ({ ...p, [k]: val }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    f.reset();
    // Send only the fields that are currently shown (hidden ones are not part of the request).
    const body: Record<string, unknown> = {
      name: f.v.name, phone: f.v.phone, email: f.v.email, pref_contact: f.v.pref_contact, service_type: f.v.service_type,
      consent: f.v.consent, website: f.v.website,
    };
    visible.forEach((fd) => { body['d_' + fd.k] = f.v['d_' + fd.k] ?? ''; });
    setBusy(true);
    try {
      const res = await post<{ ref: string }>('/public/requests', body);
      nav('/request/done', { state: { ref: res.ref } });
    } catch (err) {
      f.fail(err);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setBusy(false);
    }
  };

  const err = (k: string) => f.errors[k];
  return (
    <section className="section"><div className="wrap"><div className="formbox" style={{ marginTop: 0 }}>
      <h1>Request Travel Assistance</h1>
      <div className="notice">This form sends a request to our staff. <strong>It does not book or pay for anything.</strong> We will contact you with options and a quotation before anything is booked.</div>
      {Object.keys(f.errors).length > 0 && <div className="flash err" role="alert">Please fix the highlighted fields.</div>}
      <form onSubmit={submit} noValidate>
        <div className="hp" aria-hidden="true">
          <input name="website" tabIndex={-1} autoComplete="off" value={String(f.v.website)} onChange={(e) => set('website')(e.target.value)} />
        </div>
        <div className="card" style={{ marginTop: 18 }}><h2>Your details</h2>
          <div className="grid g2">
            <Field label="Full name *" required maxLength={120} autoComplete="name" {...f.bind('name')} />
            <Field label="Contact number *" type="tel" required maxLength={20} autoComplete="tel" {...f.bind('phone')} />
            <Field label="Email address *" type="email" required maxLength={160} autoComplete="email" {...f.bind('email')} />
            <Field label="Preferred contact method *" type="select" options={schema.contactMethods} required {...f.bind('pref_contact')} />
          </div>
        </div>
        <div className="card"><h2>What do you need?</h2>
          <Field label="Service *" type="select" options={schema.serviceTypes} required {...f.bind('service_type')} />
          {group && (
            <div className="grid g2">
              {visible.map((fd) => (
                <div key={fd.k} style={fd.type === 'textarea' ? { gridColumn: '1/-1' } : undefined}>
                  <Field
                    name={'d_' + fd.k} label={fd.label + (fd.required ? ' *' : '')} type={fd.type} options={fd.options}
                    min={fd.min} max={fd.max} required={fd.required}
                    value={String(f.v['d_' + fd.k] ?? '')} onChange={set('d_' + fd.k)} error={err(fd.k)}
                  />
                </div>
              ))}
            </div>
          )}
          {err('service_type') && <div className="err">{err('service_type')}</div>}
        </div>
        <div className="card">
          <CheckField
            name="consent" checked={!!f.v.consent} error={err('consent')} onChange={(c) => f.setV((p) => ({ ...p, consent: c }))}
            label={<>I have read and agree to the <Link to="/privacy" target="_blank">privacy notice</Link> and consent to my details being used to process this request. *</>}
          />
          <button className="btn alt big" disabled={busy}>{busy ? <><span className="spin" />Please wait…</> : 'Submit request'}</button>
        </div>
      </form>
    </div></div></section>
  );
}

export function RequestDone() {
  const loc = useLocation();
  const ref = (loc.state as { ref?: string } | null)?.ref;
  if (!ref) return <Navigate to="/request" replace />;
  return (
    <section className="section"><div className="wrap"><div className="formbox card" style={{ textAlign: 'center' }}>
      <h1>Request received</h1>
      <p>Thank you! Your travel assistance request has been submitted with the status <strong>Pending Review</strong>.</p>
      <div className="ref" aria-label="Reference number">{ref}</div>
      <p>Please keep this reference number and quote it when you contact us for updates.</p>
      <div className="notice">This is not a ticket, hotel reservation or payment confirmation. Our staff will contact you with options and a quotation.</div>
      <p style={{ marginTop: 18 }}><Link className="btn" to="/">Back to home</Link></p>
    </div></div></section>
  );
}
