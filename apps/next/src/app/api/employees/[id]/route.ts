import { api, ok, fail, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db, tx } from '@/lib/db';
import { audit } from '@/lib/biz';
import { hashPassword } from '@/lib/password';
import { employeeInput } from '@/lib/queries/employee-input';

export const POST = api(async (req, ctx) => {
  const user = await apiUser('owner');
  const { id } = await ctx.params;
  const old = /^\d+$/.test(id) ? await db.get('SELECT * FROM users WHERE id=?', [id]) : undefined;
  if (!old) return fail('Employee not found.', 404);
  const { b, fd } = await form(req);
  const { e, errors, pw } = employeeInput(b, fd.getAll('workdays'), false);
  if (!errors.username && await db.get('SELECT 1 FROM users WHERE LOWER(username)=? AND id!=?', [e.username, old.id])) errors.username = 'Already taken.';
  if (old.id === user.id && (!e.active || e.role !== 'owner')) errors.name = 'You cannot deactivate or demote your own account.';
  if (Object.keys(errors).length) return invalid(errors);
  const hash = pw ? await hashPassword(pw) : null;
  await tx(async (d) => {
    await d.run(`UPDATE users SET name=?,email=?,username=?,role=?,designation=?,active=?,can_expenses=?,sched_start=?,sched_end=?,grace_min=?,break_min=?,workdays=? WHERE id=?`,
      [e.name, e.email, e.username, e.role, e.designation || null, e.active, e.can_expenses, e.sched_start, e.sched_end, e.grace_min, e.break_min, e.workdays, old.id]);
    if (hash) await d.run('UPDATE users SET password_hash=?, must_change_pw=1 WHERE id=?', [hash, old.id]);
  });
  await audit({ user, ip: clientIp(req) }, 'employee.update', 'user', old.id, {
    before: { role: old.role, active: old.active, sched: [old.sched_start, old.sched_end, old.grace_min, old.break_min, old.workdays] },
    after: { role: e.role, active: e.active, sched: [e.sched_start, e.sched_end, e.grace_min, e.break_min, e.workdays] }, passwordReset: !!pw,
  });
  return ok('Employee saved.', { redirect: '/app/employees' });
});
