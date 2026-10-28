'use client';
import { useEffect, useState } from 'react';
import { Modal } from './modal';
import { ApiForm, Field, Submit, useFormState } from './form';

export interface ProfileValues { first_name: string; last_name: string; email: string; emp_no: string }

/** Window event that opens the My Profile dialog (the sidebar user menu sends it). */
export const PROFILE_EVT = 'profile:open';

/** My Profile dialog: edit own name and email; "Change password" opens a second dialog. Mounted in the app layout. */
export function ProfileModal({ me }: { me: ProfileValues }) {
  const [open, setOpen] = useState(false);
  const [pw, setPw] = useState(false);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener(PROFILE_EVT, on);
    return () => window.removeEventListener(PROFILE_EVT, on);
  }, []);
  if (!open) return null;
  return (
    <>
      <Modal title="Edit profile" width={420} hidden={pw} onClose={() => setOpen(false)}>
        {(close) => (
          <ApiForm action="/api/profile" stay onDone={(d) => { if (d.ok) close(); }}>
            <Field name="first_name" label="First name *" defaultValue={me.first_name} attrs={{ required: true, maxLength: 60, autoComplete: 'off' }} />
            <Field name="last_name" label="Last name *" defaultValue={me.last_name} attrs={{ required: true, maxLength: 60, autoComplete: 'off' }} />
            <Field name="email" label="Email (used to log in) *" type="email" defaultValue={me.email} attrs={{ required: true, maxLength: 160, autoComplete: 'off' }} />
            <div className="row"><Submit>Save</Submit> <button type="button" className="btn ghost" onClick={close}>Cancel</button> <button type="button" className="btn ghost" aria-haspopup="dialog" onClick={() => setPw(true)}>Change password</button></div>
          </ApiForm>
        )}
      </Modal>
      {/* The profile dialog is hidden (not unmounted, so edits are kept) while this one is open, and comes back when it closes. Sibling, not inside its form: submit events bubble through React portals. */}
      {pw && (
        <Modal title="Change password" width={400} onClose={() => setPw(false)}>
          {(close) => (
            <ApiForm action="/api/profile/password" stay reset onDone={(d) => { if (d.ok) close(); }}>
              <PasswordField name="current" label="Current password" autoComplete="current-password" />
              <PasswordField name="next" label="New password" autoComplete="new-password" minLength={8} hint="At least 8 characters, first letter capital, with a number." />
              <PasswordField name="confirm" label="Confirm new password" autoComplete="new-password" />
              <div className="row"><Submit>Update password</Submit> <button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
            </ApiForm>
          )}
        </Modal>
      )}
    </>
  );
}

/** Password input with a show/hide eye button; shows the server-side error for `name` like <Field>. */
function PasswordField({ name, label, autoComplete, minLength, hint }: { name: string; label: string; autoComplete: string; minLength?: number; hint?: string }) {
  const [show, setShow] = useState(false);
  const { errors } = useFormState();
  const e = errors[name];
  return (
    <div className={`field ${e ? 'has-err' : ''}`}>
      <label htmlFor={`f-${name}`}>{label}</label>
      <div style={{ position: 'relative' }}>
        <input id={`f-${name}`} type={show ? 'text' : 'password'} name={name} autoComplete={autoComplete} minLength={minLength} required style={{ width: '100%', paddingRight: 44 }} />
        <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} title={show ? 'Hide password' : 'Show password'}
          style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 0, padding: 6, cursor: 'pointer', color: 'inherit', display: 'flex' }}>
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            {show
              ? <><path d="M17.94 17.94A10.9 10.9 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94" /><path d="M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><path d="M1 1l22 22" /></>
              : <><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></>}
          </svg>
        </button>
      </div>
      {hint && <div className="small muted">{hint}</div>}
      {e && <div className="err" role="alert">{e}</div>}
    </div>
  );
}
