import { db } from '@/lib/db';
import { ROLE_LABELS } from '@/lib/types';
import { requireUser } from '@/lib/auth';
import { Page } from '@/components/ui';
import { ApiForm, Submit } from '@/components/form';

export const metadata = { title: 'My Profile' };

export default async function Profile() {
  const me = await requireUser();
  const u = (await db.get('SELECT * FROM users WHERE id=?', [me.id]))!;
  return (
    <Page title="My Profile">
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card"><h2>My details</h2>
          <dl className="kv"><dt>Name</dt><dd>{u.name}</dd><dt>Employee no.</dt><dd>{u.emp_no}</dd><dt>Username</dt><dd>{u.username}</dd><dt>Email</dt><dd>{u.email || '—'}</dd><dt>Role</dt><dd>{ROLE_LABELS[u.role] ?? u.role}</dd>
            <dt>Schedule</dt><dd>{u.sched_start} – {u.sched_end}, grace {u.grace_min} min, break {u.break_min} min</dd></dl>
          <p className="muted small">To change these details, ask the owner.</p></div>
        <ApiForm action="/api/profile/password" className="card" reset>
          <h2>Change password</h2>
          <div className="field"><label htmlFor="c">Current password</label><input id="c" type="password" name="current" autoComplete="current-password" required /></div>
          <div className="field"><label htmlFor="n">New password</label><input id="n" type="password" name="next" minLength={10} autoComplete="new-password" required /><div className="small muted">At least 10 characters, with letters and numbers.</div></div>
          <div className="field"><label htmlFor="k">Confirm new password</label><input id="k" type="password" name="confirm" autoComplete="new-password" required /></div>
          <Submit>Update password</Submit>
        </ApiForm>
      </div>
    </Page>
  );
}
