import { api, ok, fail, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db, tx } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now, str, toCents } from '@/lib/util';

/**
 * Owner / admin: change an employee's hourly rate and work schedule / attendance rules (stored on the user account,
 * where time-in lateness and hours are calculated from). Payroll already generated keeps the rate it was made with.
 */
export const POST = api(async (req, ctx) => {
  const user = await apiUser('owner');
  const { id } = await ctx.params;
  const emp = /^\d+$/.test(id) ? await db.get('SELECT e.*, u.name, u.sched_start, u.sched_end, u.grace_min, u.break_min, u.workdays FROM employees e JOIN users u ON u.id=e.user_id WHERE e.id=?', [id]) : undefined;
  if (!emp) return fail('Employee not found.', 404);
  const { b, fd } = await form(req);
  const T = /^([01]\d|2[0-3]):[0-5]\d$/;
  const v = {
    rate: toCents(b.hourly_rate), sched_start: str(b.sched_start, 5), sched_end: str(b.sched_end, 5),
    grace_min: parseInt(String(b.grace_min ?? ''), 10), break_min: parseInt(String(b.break_min ?? ''), 10),
    workdays: [...new Set(fd.getAll('workdays').map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort().join(','),
  };
  const errors: Record<string, string> = {};
  if (!Number.isFinite(v.rate) || v.rate <= 0) errors.hourly_rate = 'Enter the hourly rate, e.g. 100.00.';
  else if (v.rate > 10_000_00) errors.hourly_rate = 'That rate looks too high (max ₱10,000/hour).';
  if (!T.test(v.sched_start)) errors.sched_start = 'Use HH:MM.';
  if (!T.test(v.sched_end) || v.sched_end <= v.sched_start) errors.sched_end = 'Must be after the start time.';
  if (!(v.grace_min >= 0 && v.grace_min <= 120)) errors.grace_min = '0–120 minutes.';
  if (!(v.break_min >= 0 && v.break_min <= 240)) errors.break_min = '0–240 minutes.';
  if (!v.workdays) errors.workdays = 'Choose at least one workday.';
  if (Object.keys(errors).length) return invalid(errors);
  await tx(async (d) => {
    await d.run('UPDATE employees SET hourly_rate=?, updated_at=? WHERE id=?', [v.rate, now(), emp.id]);
    await d.run('UPDATE users SET sched_start=?,sched_end=?,grace_min=?,break_min=?,workdays=? WHERE id=?', [v.sched_start, v.sched_end, v.grace_min, v.break_min, v.workdays, emp.user_id]);
  });
  await audit({ user, ip: clientIp(req) }, 'employee.update', 'employee', emp.id, {
    before: { rate: emp.hourly_rate, sched: [emp.sched_start, emp.sched_end, emp.grace_min, emp.break_min, emp.workdays] },
    after: { rate: v.rate, sched: [v.sched_start, v.sched_end, v.grace_min, v.break_min, v.workdays] },
  });
  return ok(`${emp.name} saved.`);
});
