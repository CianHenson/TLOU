import { api, ok, fail, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { LEAVE_KINDS } from '@/lib/types';
import { addDays, isDate, now, str, today } from '@/lib/util';
import { employeeOf } from '@/lib/queries/payroll';

/** An employee files a day-off / leave request for themself (1–31 days). Overlapping pending or approved requests are refused. */
export const POST = api(async (req) => {
  const user = await apiUser();
  if (!(await employeeOf(user.id))) return fail('Only employees in attendance monitoring can file day-off requests.', 403);
  const { b } = await form(req);
  const kind = LEAVE_KINDS.includes(String(b.kind)) ? String(b.kind) : '';
  const from = str(b.from_day, 10), to = str(b.to_day, 10) || from, reason = str(b.reason, 1000);
  const errors: Record<string, string> = {};
  if (!kind) errors.kind = 'Choose a request type.';
  if (!isDate(from)) errors.from_day = 'Choose a date.';
  else if (from < addDays(today(), -30)) errors.from_day = 'Requests can go back at most 30 days.';
  if (!isDate(to)) errors.to_day = 'Choose a date.';
  else if (isDate(from) && to < from) errors.to_day = 'Must be on or after the start date.';
  else if (isDate(from) && to > addDays(from, 30)) errors.to_day = 'A request can cover at most 31 days.';
  if (!reason) errors.reason = 'Tell us the reason.';
  if (Object.keys(errors).length) return invalid(errors);
  const clash = await db.get(`SELECT from_day, to_day, status FROM leave_requests WHERE user_id=? AND status IN ('Pending','Approved') AND from_day<=? AND to_day>=?`, [user.id, to, from]);
  if (clash) return fail(`You already have a ${clash.status.toLowerCase()} request for ${clash.from_day}${clash.to_day !== clash.from_day ? ` to ${clash.to_day}` : ''}.`);
  const { id } = await db.run('INSERT INTO leave_requests (user_id,kind,from_day,to_day,reason,status,created_at) VALUES (?,?,?,?,?,?,?)', [user.id, kind, from, to, reason, 'Pending', now()]);
  await audit({ user, ip: clientIp(req) }, 'leave_request.create', 'leave_request', id, { kind, from, to });
  return ok('Request sent. You will see the decision here once it is reviewed.');
});
