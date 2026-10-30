import { api, ok, fail, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { ATT_STATUSES } from '@/lib/types';
import { addDays, isDate, now, str, today } from '@/lib/util';
import { employeeOf } from '@/lib/queries/payroll';

/**
 * An employee asks to correct one of their own attendance days (time in, time out and / or status, one or more at once,
 * with a required reason). Nothing changes until the owner / admin approves it (see corrections/[id]/review).
 */
export const POST = api(async (req) => {
  const user = await apiUser();
  if (!(await employeeOf(user.id))) return fail('Only employees in attendance monitoring can request corrections.', 403);
  const { fd, b } = await form(req);
  const day = str(b.day, 10), reason = str(b.reason, 1000);
  const fields = fd.getAll('field').map(String), values = fd.getAll('value').map((v) => String(v).trim());
  const T = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!isDate(day) || day > today() || day < addDays(today(), -60)) return fail('Corrections can be requested for the last 60 days only.');
  if (!fields.length || fields.length !== values.length || fields.length > 3 || new Set(fields).size !== fields.length) return fail('Add one to three different corrections.');
  for (const [i, f] of fields.entries()) {
    if ((f === 'time_in' || f === 'time_out') && !T.test(values[i])) return fail('Enter valid times (HH:MM).');
    if (f === 'status' && !ATT_STATUSES.includes(values[i])) return fail('Choose a valid status.');
    if (!['time_in', 'time_out', 'status'].includes(f)) return fail('Unknown correction type.');
  }
  if (!reason) return invalid({ reason: 'Tell us the reason for the correction.' });
  if (await db.get(`SELECT id FROM attendance_correction_requests WHERE user_id=? AND day=? AND status='Pending'`, [user.id, day])) return fail('You already have a pending correction request for that day.');
  const changes = JSON.stringify(fields.map((f, i) => ({ field: f, value: values[i] })));
  const { id } = await db.run('INSERT INTO attendance_correction_requests (user_id,day,changes,reason,status,created_at) VALUES (?,?,?,?,?,?)', [user.id, day, changes, reason, 'Pending', now()]);
  await audit({ user, ip: clientIp(req) }, 'attendance_correction.request', 'attendance_correction', id, { day, changes });
  return ok('Correction request sent. You will see the decision on that day once it is reviewed.');
});
