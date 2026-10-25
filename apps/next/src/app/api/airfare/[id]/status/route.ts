import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit, CHECKIN_STATUSES } from '@/lib/biz';
import { now } from '@/lib/util';

/** Quick check-in status change from the list (no full form). */
export const POST = api(async (req, ctx) => {
  const user = await apiUser();
  const { id } = await ctx.params;
  const old = /^\d+$/.test(id) ? await db.get('SELECT id, checkin_status FROM airfare_sales WHERE id=?', [id]) : undefined;
  if (!old) return fail('Sale not found.', 404);
  const { b } = await form(req);
  const status = String(b.status ?? '');
  if (!CHECKIN_STATUSES.includes(status)) return fail('Choose a status.');
  await db.run('UPDATE airfare_sales SET checkin_status=?, updated_at=? WHERE id=?', [status, now(), old.id]);
  await audit({ user, ip: clientIp(req) }, 'airfare.status', 'airfare', old.id, { from: old.checkin_status, to: status });
  return ok(`Check-in status set to ${status}.`);
});
