import { api, ok, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db, tx } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now } from '@/lib/util';
import { hashPassword } from '@/lib/password';
import { employeeInput } from '@/lib/queries/employee-input';

export const POST = api(async (req) => {
  const user = await apiUser('owner');
  const { b, fd } = await form(req);
  const { e, errors, pw } = employeeInput(b, fd.getAll('workdays'), true);
  if (!errors.username && await db.get('SELECT 1 FROM users WHERE LOWER(username)=?', [e.username])) errors.username = 'Already taken.';
  if (Object.keys(errors).length) return invalid(errors);
  const hash = await hashPassword(pw);
  const id = await tx(async (d) => {
    const i = (await d.run(`INSERT INTO users (name,email,username,password_hash,role,active,can_expenses,must_change_pw,sched_start,sched_end,grace_min,break_min,workdays,created_at) VALUES (?,?,?,?,?,?,?,1,?,?,?,?,?,?)`,
      [e.name, e.email, e.username, hash, e.role, e.active, e.can_expenses, e.sched_start, e.sched_end, e.grace_min, e.break_min, e.workdays, now()])).id;
    await d.run('UPDATE users SET emp_no=? WHERE id=?', ['EMP-' + String(i).padStart(4, '0'), i]);
    return i;
  });
  await audit({ user, ip: clientIp(req) }, 'employee.create', 'user', id, { username: e.username, role: e.role });
  return ok('Employee created. They must change the password at first login.', { redirect: '/app/employees' });
});
