import { api, ok, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db, tx } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now } from '@/lib/util';
import { hashPassword } from '@/lib/password';
import { employeeInput } from '@/lib/queries/employee-input';

export const POST = api(async (req) => {
  const user = await apiUser('owner');
  const { b } = await form(req);
  const { e, errors, pw } = employeeInput(b, true);
  if (!errors.email && await db.get('SELECT 1 FROM users WHERE LOWER(email)=? OR LOWER(username)=?', [e.email, e.email])) errors.email = 'Already registered.';
  if (Object.keys(errors).length) return invalid(errors);
  const hash = await hashPassword(pw);
  const id = await tx(async (d) => {
    // Schedule columns (shift, grace, break, workdays) keep their defaults; they are set from attendance, not here.
    const i = (await d.run(`INSERT INTO users (name,first_name,last_name,email,username,password_hash,role,designation,active,can_expenses,must_change_pw,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,1,?)`,
      [e.name, e.first_name, e.last_name, e.email, e.email, hash, e.role, e.designation || null, e.active, e.can_expenses, now()])).id;
    await d.run('UPDATE users SET emp_no=? WHERE id=?', ['EMP-' + String(i).padStart(4, '0'), i]);
    // Staff are attendance employees from the start; without this row they could not time in or request a day off.
    if (e.role === 'employee') await d.run('INSERT IGNORE INTO employees (user_id,hourly_rate,active,created_at) VALUES (?,0,?,?)', [i, e.active, now()]);
    return i;
  });
  await audit({ user, ip: clientIp(req) }, 'employee.create', 'user', id, { email: e.email, role: e.role });
  return ok('User created. They must change the password at first login.', { redirect: '/app/employees' });
});
