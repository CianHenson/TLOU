import { api, ok, fail, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';

/** Owner / admin: delete a generated payroll record (e.g. to regenerate it after corrections). The full row is kept in the audit log. */
export const POST = api(async (req, ctx) => {
  const user = await apiUser('owner');
  const { id } = await ctx.params;
  const p = /^\d+$/.test(id) ? await db.get('SELECT * FROM payroll WHERE id=?', [id]) : undefined;
  if (!p) return fail('Payroll record not found.', 404);
  await db.run('DELETE FROM payroll WHERE id=?', [p.id]);
  await audit({ user, ip: clientIp(req) }, 'payroll.delete', 'payroll', p.id, p);
  return ok('Payroll record deleted.');
});
