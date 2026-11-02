import { api, ok, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now, toCents } from '@/lib/util';

/**
 * Owner / admin: assign an existing registered Staff or Admin account as an employee for attendance and payroll, with an hourly
 * rate. No new account is created; the owner account and users already added are refused.
 */
export const POST = api(async (req) => {
  const user = await apiUser('owner');
  const { b } = await form(req);
  const uid = /^\d+$/.test(String(b.user_id ?? '')) ? Number(b.user_id) : 0;
  const rate = toCents(b.hourly_rate);
  const errors: Record<string, string> = {};
  const u = uid ? await db.get('SELECT id, name, role, active FROM users WHERE id=?', [uid]) : undefined;
  if (!u || !u.active) errors.user_id = 'Choose a registered user.';
  else if (u.role === 'owner') errors.user_id = 'The owner account cannot be an employee.';
  if (!Number.isFinite(rate) || rate <= 0) errors.hourly_rate = 'Enter the hourly rate, e.g. 100.00.';
  else if (rate > 10_000_00) errors.hourly_rate = 'That rate looks too high (max ₱10,000/hour).';
  if (Object.keys(errors).length) return invalid(errors);
  const existing = await db.get('SELECT id, active FROM employees WHERE user_id=?', [uid]);
  if (existing) return invalid({ user_id: existing.active ? `${u!.name} is already an employee.` : `${u!.name} is already an employee (deactivated) — activate them instead.` });
  const { id } = await db.run('INSERT INTO employees (user_id,hourly_rate,active,created_by,created_at) VALUES (?,?,1,?,?)', [uid, rate, user.id, now()]);
  await audit({ user, ip: clientIp(req) }, 'employee.assign', 'employee', id, { user_id: uid, hourly_rate: rate });
  return ok(`${u!.name} added as an employee.`);
});
