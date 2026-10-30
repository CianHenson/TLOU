'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ApiForm, Submit } from '@/components/form';
import { FlashBar } from '@/components/flash';

const Eye = ({ off }: { off: boolean }) => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {off ? (
      <><path d="M17.94 17.94A10.9 10.9 0 0 1 12 20C5 20 1 12 1 12a18.5 18.5 0 0 1 5.06-5.94" /><path d="M9.9 4.24A10.9 10.9 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><path d="M14.12 14.12a3 3 0 1 1-4.24-4.24" /><path d="M1 1l22 22" /></>
    ) : (
      <><path d="M1 12S5 4 12 4s11 8 11 8-4 8-11 8S1 12 1 12z" /><circle cx="12" cy="12" r="3" /></>
    )}
  </svg>
);

export function LoginForm() {
  const [show, setShow] = useState(false);
  return (
    <ApiForm action="/api/auth/login" className="lg-card">
      <h2>Sign in to your account</h2>
      <p className="lg-sub">Enter your credentials to continue</p>
      <FlashBar />
      <div className="lg-field">
        <label htmlFor="u">Email or username</label>
        <input id="u" type="text" name="email" autoComplete="username" autoCapitalize="none" spellCheck={false} data-no-caps required autoFocus />
      </div>
      <div className="lg-field">
        <label htmlFor="p">Password</label>
        <div className="lg-pw">
          <input id="p" type={show ? 'text' : 'password'} name="password" autoComplete="current-password" required />
          <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Hide password' : 'Show password'} aria-pressed={show} title={show ? 'Hide password' : 'Show password'}>
            <Eye off={show} />
          </button>
        </div>
      </div>
      <div className="lg-row">
        <label className="lg-remember"><input type="checkbox" name="remember" /> Remember me</label>
        <Link href="/contact" className="lg-forgot">Forgot password?</Link>
      </div>
      <Submit className="lg-btn">Sign in</Submit>
      <Link href="/" className="lg-back">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
        Back to Landing Page
      </Link>
    </ApiForm>
  );
}
