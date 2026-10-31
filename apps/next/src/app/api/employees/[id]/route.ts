import { api, ok, fail, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db, tx } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now } from '@/lib/util';
import { hashPassword } from '@/lib/password';
import { employeeInput } from '@/lib/queries/employee-input';

export const POST = api(async (req, ctx) => {
  const user = await apiUser('owner');
  const { id } = await ctx.params;
  const old = /^\d+$/.test(id) ? await db.get('SELECT * FROM users WHERE id=?', [id]) : undefined;
  if (!old) return fail('Employee not found.', 404);
  // There is one owner: only they can see and edit their own account, and it always stays an active owner with full access.
  if (old.role === 'owner' && old.id !== user.id) return fail('Employee not found.', 404);
  const { b } = await form(req);
  const { e, errors, pw } = employeeInput(b, false);
  if (old.role === 'owner') { e.role = 'owner'; e.active = 1; e.can_expenses = 1; }
  if (!errors.email && await db.get('SELECT 1 FROM users WHERE (LOWER(email)=? OR LOWER(username)=?) AND id!=?', [e.email, e.email, old.id])) errors.email = 'Already registered.';
  if (old.id === user.id && (!e.active || e.role !== old.role)) errors.first_name = 'You cannot deactivate or change the role of your own account.';
  if (Object.keys(errors).length) return invalid(errors);
  const hash = pw ? await hashPassword(pw) : null;
  await tx(async (d) => {
    // Account details only; the work schedule columns are left as they are.
    await d.run(`UPDATE users SET name=?,first_name=?,last_name=?,email=?,username=?,role=?,designation=?,active=?,can_expenses=? WHERE id=?`,
      [e.name, e.first_name, e.last_name, e.email, e.email, e.role, e.designation || null, e.active, e.can_expenses, old.id]);
    if (e.role === 'employee') await d.run('INSERT IGNORE INTO employees (user_id,hourly_rate,active,created_at) VALUES (?,0,?,?)', [old.id, e.active, now()]);
    if (hash) await d.run('UPDATE users SET password_hash=?, must_change_pw=1 WHERE id=?', [hash, old.id]);
  });
  await audit({ user, ip: clientIp(req) }, 'employee.update', 'user', old.id, {
    before: { name: old.name, role: old.role, active: old.active, designation: old.designation },
    after: { name: e.name, role: e.role, active: e.active, designation: e.designation || null }, passwordReset: !!pw,
  });
  return ok('User saved.', { redirect: '/app/employees' });
});
