import { api, clientIp, fail, ok } from '@/lib/http';
import { db } from '@/lib/db';
import { audit, lateInfo } from '@/lib/biz';
import { apiUser } from '@/lib/auth';
import { hm12, now } from '@/lib/util';
import { canClock } from '@/lib/queries/clock';

export const POST = api(async (req) => {
  const user = await apiUser();
  if (!(await canClock(user))) return fail('Your attendance is not active. Please ask the owner or an admin.');
  const u = (await db.get('SELECT * FROM users WHERE id=?', [user.id]))!, n = now(), day = n.slice(0, 10);
  const late = lateInfo(u, n);
  // INSERT IGNORE + the (user, day) unique key: two quick clicks can never create two time-ins for the same day.
  const r = await db.run('INSERT IGNORE INTO attendance (user_id,day,time_in,is_late,late_min) VALUES (?,?,?,?,?)', [user.id, day, n, late.is_late, late.late_min]);
  if (!r.affected) return fail('You have already timed in today.');
  await audit({ user, ip: clientIp(req) }, 'attendance.in', 'attendance', r.id, n);
  return ok(`Time-in recorded at ${hm12(n)}${late.is_late ? ` — marked late by ${late.late_min} min` : ' — on time'}.`);
});
