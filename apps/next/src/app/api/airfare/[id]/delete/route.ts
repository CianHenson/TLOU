import { api, ok, fail, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';

/** Owner only: removes a wrongly entered sale. The full row is kept in the audit log. */
export const POST = api(async (req, ctx) => {
  const user = await apiUser('owner');
  const { id } = await ctx.params;
  const old = /^\d+$/.test(id) ? await db.get('SELECT * FROM airfare_sales WHERE id=?', [id]) : undefined;
  if (!old) return fail('Sale not found.', 404);
  await db.run('DELETE FROM airfare_sales WHERE id=?', [old.id]);
  await audit({ user, ip: clientIp(req) }, 'airfare.delete', 'airfare', old.id, old);
  return ok('Airfare sale deleted.', { redirect: '/app/airfare' });
});
