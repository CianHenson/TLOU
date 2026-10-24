'use client';
import Link from 'next/link';
import { ApiForm, Field, Submit, useFormState } from '@/components/form';
import { FlashBar } from '@/components/flash';

export function Consent({ children }: { children: React.ReactNode }) {
  const { errors } = useFormState();
  return (
    <div className={`field ${errors.consent ? 'has-err' : ''}`}>
      <label style={{ fontWeight: 500 }}><input type="checkbox" name="consent" /> {children}</label>
      {errors.consent && <div className="err" role="alert">{errors.consent}</div>}
    </div>
  );
}

export const Honeypot = () => <div className="hp" aria-hidden="true"><input name="website" tabIndex={-1} autoComplete="off" /></div>;

export function ContactForm({ showFlash }: { showFlash?: boolean }) {
  return (
    <ApiForm action="/api/public/contact" className="card" reset>
      <h2>Send us a message</h2>
      {showFlash && <FlashBar />}
      <Honeypot />
      <Field name="name" label="Full name" attrs={{ required: true, maxLength: 120 }} />
      <Field name="email" label="Email" type="email" attrs={{ required: true, maxLength: 160 }} />
      <Field name="phone" label="Phone (optional)" attrs={{ maxLength: 40 }} />
      <Field name="body" label="Message" type="textarea" attrs={{ required: true, maxLength: 3000 }} />
      <Consent>I agree to the <Link href="/privacy" target="_blank">privacy notice</Link>.</Consent>
      <Submit>Send message</Submit>
    </ApiForm>
  );
}
