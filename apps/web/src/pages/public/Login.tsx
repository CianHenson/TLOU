import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../lib/auth';

export default function Login() {
  const { user, login } = useAuth();
  const nav = useNavigate();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={user.must_change_pw ? '/app/profile' : '/app'} replace />;

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setBusy(true);
    setError('');
    try {
      const u = await login(String(f.get('username')), String(f.get('password')));
      nav(u.must_change_pw ? '/app/profile' : '/app');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="wrap">
      <form className="narrow card" onSubmit={submit}>
        <h1>Staff login</h1>
        {error && <div className="flash err" role="alert">{error}</div>}
        <div className="field"><label htmlFor="u">Username</label><input id="u" name="username" autoComplete="username" required autoFocus /></div>
        <div className="field"><label htmlFor="p">Password</label><input id="p" type="password" name="password" autoComplete="current-password" required /></div>
        <button className="btn" style={{ width: '100%' }} disabled={busy}>{busy ? <><span className="spin" />Please wait…</> : 'Log in'}</button>
        <p className="small muted">Authorized personnel only. Activity is logged.</p>
        <p className="small muted">Demo accounts: <b>owner</b> / owner123 · <b>maria</b> / staff123 · <b>jose</b> / staff123</p>
      </form>
    </div>
  );
}
