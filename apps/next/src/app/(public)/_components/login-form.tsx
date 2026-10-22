'use client';
import { ApiForm, Submit } from '@/components/form';
import { FlashBar } from '@/components/flash';

export function LoginForm() {
  return (
    <ApiForm action="/api/auth/login" className="narrow card">
      <h1>Staff login</h1>
      <FlashBar />
      <div className="field"><label htmlFor="u">Username</label><input id="u" name="username" autoComplete="username" required autoFocus /></div>
      <div className="field"><label htmlFor="p">Password</label><input id="p" type="password" name="password" autoComplete="current-password" required /></div>
      <Submit>Log in</Submit>
      <p className="small muted">Authorized personnel only. Activity is logged.</p>
    </ApiForm>
  );
}
