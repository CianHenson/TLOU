import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now } from '@/lib/util';

/**
 * Owner / admin: deactivate (`active=0`) or reactivate (`active=1`) an employee. Deactivated employees keep all their
 * attendance and payroll history but drop out of today's monitoring, new payroll and time-in.
 */
export const POST = api(async (req, ctx) => {
  const user = await apiUser('owner');
  const { id } = await ctx.params;
  const emp = /^\d+$/.test(id) ? await db.get('SELECT e.*, u.name, u.active AS user_active FROM employees e JOIN users u ON u.id=e.user_id WHERE e.id=?', [id]) : undefined;
  if (!emp) return fail('Employee not found.', 404);
  const { b } = await form(req);
  const active = String(b.active) === '1' ? 1 : 0;
  if (active && !emp.user_active) return fail(`${emp.name}'s user account is deactivated — activate it in User Management first.`);
  if (emp.active === active) return ok(active ? 'Already active.' : 'Already deactivated.');
  await db.run('UPDATE employees SET active=?, updated_at=? WHERE id=?', [active, now(), emp.id]);
  await audit({ user, ip: clientIp(req) }, active ? 'employee.activate' : 'employee.deactivate', 'employee', emp.id, { user_id: emp.user_id });
  return ok(`${emp.name} ${active ? 'reactivated' : 'deactivated'}.`);
});
