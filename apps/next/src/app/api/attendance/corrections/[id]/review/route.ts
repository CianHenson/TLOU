import { api, ok, fail, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db, tx } from '@/lib/db';
import { audit, lateInfo } from '@/lib/biz';
import { now, str } from '@/lib/util';

/**
 * Owner / admin: approve or decline a staff correction request (`action` = approve | decline; declining needs a reason the
 * employee sees). Approving applies the time changes the same way a direct correction does (original times kept in
 * attendance_corrections). A status change is applied where it can be: Present clears the late mark, Approved leave / Holiday
 * add that day to `leaves`; other statuses follow from the times, so they are only noted.
 */
export const POST = api(async (req, ctx) => {
  const user = await apiUser('owner');
  const { id } = await ctx.params;
  const r = /^\d+$/.test(id) ? await db.get('SELECT c.*, u.name FROM attendance_correction_requests c JOIN users u ON u.id=c.user_id WHERE c.id=?', [id]) : undefined;
  if (!r) return fail('Request not found.', 404);
  if (r.status !== 'Pending') return fail(`This request was already ${r.status.toLowerCase()}.`);
  const { b } = await form(req);
  const meta = { user, ip: clientIp(req) };

  if (b.action === 'decline') {
    const reason = str(b.decline_reason, 1000);
    if (!reason) return invalid({ decline_reason: 'Enter the reason for declining.' });
    await db.run(`UPDATE attendance_correction_requests SET status='Declined', decline_reason=?, reviewed_by=?, reviewed_at=? WHERE id=? AND status='Pending'`, [reason, user.id, now(), r.id]);
    await audit(meta, 'attendance_correction.decline', 'attendance_correction', r.id, { reason });
    return ok(`${r.name}'s correction request declined.`);
  }
  if (b.action !== 'approve') return fail('Unknown action.');

  const changes: { field: string; value: string }[] = JSON.parse(r.changes);
  const get = (f: string) => changes.find((c) => c.field === f)?.value;
  const u = (await db.get('SELECT * FROM users WHERE id=?', [r.user_id]))!;
  const old = await db.get('SELECT * FROM attendance WHERE user_id=? AND day=?', [r.user_id, r.day]);
  const tin = get('time_in'), tout = get('time_out'), status = get('status');
  const newIn = tin ? `${r.day} ${tin}:00` : old?.time_in ?? null;
  const newOut = tout ? `${r.day} ${tout}:00` : old?.time_out ?? null;
  if ((tin || tout) && !newIn) return fail('There is no time in on that day — the request must include a time in.');
  if (newIn && newOut && newOut <= newIn) return fail('The corrected time out must be after the time in.');
  const notes: string[] = [];
  await tx(async (d) => {
    if (tin || tout) {
      const late = lateInfo(u, newIn!);
      await d.run('INSERT INTO attendance_corrections (user_id,day,old_in,old_out,new_in,new_out,reason,by_user,at) VALUES (?,?,?,?,?,?,?,?,?)', [r.user_id, r.day, old?.time_in, old?.time_out, newIn, newOut, `Staff request: ${r.reason}`, user.id, now()]);
      if (old) await d.run('UPDATE attendance SET time_in=?,time_out=?,is_late=?,late_min=? WHERE id=?', [newIn, newOut, late.is_late, late.late_min, old.id]);
      else await d.run('INSERT INTO attendance (user_id,day,time_in,time_out,is_late,late_min) VALUES (?,?,?,?,?,?)', [r.user_id, r.day, newIn, newOut, late.is_late, late.late_min]);
    }
    if (status === 'Present' && (old || tin)) await d.run('UPDATE attendance SET is_late=0, late_min=0 WHERE user_id=? AND day=?', [r.user_id, r.day]);
    else if (status === 'Approved leave') await d.run('INSERT IGNORE INTO leaves (user_id,day,kind,note) VALUES (?,?,?,?)', [r.user_id, r.day, 'Leave', 'Correction request']);
    else if (status === 'Holiday') await d.run('INSERT IGNORE INTO leaves (user_id,day,kind,note) VALUES (?,?,?,?)', [r.user_id, r.day, 'Holiday', 'Correction request']);
    else if (status) notes.push(`status "${status}" follows from the recorded times, so nothing else was changed`);
    await d.run(`UPDATE attendance_correction_requests SET status='Approved', decline_reason=NULL, reviewed_by=?, reviewed_at=? WHERE id=?`, [user.id, now(), r.id]);
  });
  await audit(meta, 'attendance_correction.approve', 'attendance_correction', r.id, { changes });
  return ok(`${r.name}'s correction approved${notes.length ? ` (${notes.join('; ')})` : ''}.`);
});
