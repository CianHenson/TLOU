import { api, clientIp, fail, ok } from '@/lib/http';
import { db } from '@/lib/db';
import { audit, lateInfo } from '@/lib/biz';
import { apiUser } from '@/lib/auth';
import { now } from '@/lib/util';

export const POST = api(async (req) => {
  const user = await apiUser();
  const u = (await db.get('SELECT * FROM users WHERE id=?', [user.id]))!, n = now(), day = n.slice(0, 10);
  if (await db.get('SELECT 1 FROM attendance WHERE user_id=? AND day=?', [user.id, day])) return fail('You have already timed in today.');
  const late = lateInfo(u, n);
  const r = await db.run('INSERT INTO attendance (user_id,day,time_in,is_late,late_min) VALUES (?,?,?,?,?)', [user.id, day, n, late.is_late, late.late_min]);
  await audit({ user, ip: clientIp(req) }, 'attendance.in', 'attendance', r.id, n);
  return ok(`Time-in recorded at ${n.slice(11, 16)}${late.is_late ? ` — marked late by ${late.late_min} min` : ' — on time'}.`);
});
