import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db, tx } from '@/lib/db';
import { audit, lateInfo } from '@/lib/biz';
import { isDate, now, str, today } from '@/lib/util';

// Correct a record: original values are preserved in attendance_corrections with the mandatory reason.
export const POST = api(async (req) => {
  const user = await apiUser('owner');
  const { b } = await form(req);
  const uid = Number(b.user_id), day = str(b.day, 10), reason = str(b.reason, 500);
  const u = Number.isInteger(uid) ? await db.get('SELECT * FROM users WHERE id=?', [uid]) : undefined;
  const tin = str(b.time_in, 5), tout = str(b.time_out, 5), T = /^([01]\d|2[0-3]):[0-5]\d$/;
  if (!u || !isDate(day)) return fail('Invalid employee or date.');
  if (!reason) return fail('A documented reason is required for corrections.');
  if (day > today()) return fail('Cannot record attendance for a future date.');
  if (!T.test(tin) || (tout && !T.test(tout)) || (tout && tout <= tin)) return fail('Enter valid times; time-out must be after time-in.');
  const newIn = `${day} ${tin}:00`, newOut = tout ? `${day} ${tout}:00` : null;
  const old = await db.get('SELECT * FROM attendance WHERE user_id=? AND day=?', [uid, day]);
  const late = lateInfo(u, newIn);
  await tx(async (d) => {
    await d.run('INSERT INTO attendance_corrections (user_id,day,old_in,old_out,new_in,new_out,reason,by_user,at) VALUES (?,?,?,?,?,?,?,?,?)', [uid, day, old?.time_in, old?.time_out, newIn, newOut, reason, user.id, now()]);
    if (old) await d.run('UPDATE attendance SET time_in=?,time_out=?,is_late=?,late_min=? WHERE id=?', [newIn, newOut, late.is_late, late.late_min, old.id]);
    else await d.run('INSERT INTO attendance (user_id,day,time_in,time_out,is_late,late_min) VALUES (?,?,?,?,?,?)', [uid, day, newIn, newOut, late.is_late, late.late_min]);
  });
  await audit({ user, ip: clientIp(req) }, 'attendance.correct', 'attendance', `${uid}:${day}`, { from: old ? [old.time_in, old.time_out] : null, to: [newIn, newOut], reason });
  return ok('Attendance corrected and logged.');
});
