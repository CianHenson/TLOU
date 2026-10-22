import { api, clientIp, fail, ok } from '@/lib/http';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { apiUser } from '@/lib/auth';
import { now } from '@/lib/util';

export const POST = api(async (req) => {
  const user = await apiUser();
  const n = now();
  const rec = await db.get('SELECT * FROM attendance WHERE user_id=? AND day=?', [user.id, n.slice(0, 10)]);
  if (!rec || !rec.time_in) return fail('No open attendance record — time in first.');
  if (rec.time_out) return fail('You have already timed out today.');
  await db.run('UPDATE attendance SET time_out=? WHERE id=?', [n, rec.id]);
  await audit({ user, ip: clientIp(req) }, 'attendance.out', 'attendance', rec.id, n);
  return ok(`Time-out recorded at ${n.slice(11, 16)}.`);
});
