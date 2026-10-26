import { api, ok, fail, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db, tx } from '@/lib/db';
import { audit, schedFor } from '@/lib/biz';
import { addDays, dow, now, str } from '@/lib/util';

/**
 * Owner / admin: approve or decline a pending day-off request (`action` = approve | decline). Declining needs a reason,
 * which the employee sees. Approving writes approved-leave days (scheduled workdays only) into `leaves`, so those days
 * show as "Approved leave" instead of absences and are never counted as worked; it is refused when the employee already
 * attended one of those days or another approved request overlaps.
 */
export const POST = api(async (req, ctx) => {
  const user = await apiUser('owner');
  const { id } = await ctx.params;
  const r = /^\d+$/.test(id) ? await db.get('SELECT r.*, u.name, u.workdays, u.sched_start, u.sched_end, u.grace_min, u.break_min FROM leave_requests r JOIN users u ON u.id=r.user_id WHERE r.id=?', [id]) : undefined;
  if (!r) return fail('Request not found.', 404);
  if (r.status !== 'Pending') return fail(`This request was already ${r.status.toLowerCase()}.`);
  const { b } = await form(req);
  const meta = { user, ip: clientIp(req) };

  if (b.action === 'decline') {
    const reason = str(b.decline_reason, 1000);
    if (!reason) return invalid({ decline_reason: 'Enter the reason for declining.' });
    await db.run(`UPDATE leave_requests SET status='Declined', decline_reason=?, reviewed_by=?, reviewed_at=? WHERE id=? AND status='Pending'`, [reason, user.id, now(), r.id]);
    await audit(meta, 'leave_request.decline', 'leave_request', r.id, { reason });
    return ok(`${r.name}'s request declined.`);
  }
  if (b.action !== 'approve') return fail('Unknown action.');

  const clash = await db.get(`SELECT from_day, to_day FROM leave_requests WHERE user_id=? AND status='Approved' AND id!=? AND from_day<=? AND to_day>=?`, [r.user_id, r.id, r.to_day, r.from_day]);
  if (clash) return fail(`${r.name} already has approved leave for ${clash.from_day}${clash.to_day !== clash.from_day ? ` to ${clash.to_day}` : ''}.`);
  const worked = await db.all('SELECT day FROM attendance WHERE user_id=? AND day BETWEEN ? AND ? AND time_in IS NOT NULL ORDER BY day', [r.user_id, r.from_day, r.to_day]);
  if (worked.length) return fail(`${r.name} has attendance on ${worked.map((w) => w.day).join(', ')} — correct those records or decline the request.`);
  const days: string[] = [];
  const workdays = schedFor(r).days;
  for (let d = r.from_day; d <= r.to_day; d = addDays(d, 1)) if (workdays.includes(dow(d))) days.push(d);
  await tx(async (d) => {
    await d.run(`UPDATE leave_requests SET status='Approved', decline_reason=NULL, reviewed_by=?, reviewed_at=? WHERE id=?`, [user.id, now(), r.id]);
    for (const day of days) await d.run('INSERT IGNORE INTO leaves (user_id,day,kind,note,request_id) VALUES (?,?,?,?,?)', [r.user_id, day, 'Leave', r.kind, r.id]);
  });
  await audit(meta, 'leave_request.approve', 'leave_request', r.id, { days });
  return ok(`${r.name}'s request approved${days.length ? ` (${days.length} workday${days.length === 1 ? '' : 's'} on leave)` : ' — it covers no scheduled workdays'}.`);
});
