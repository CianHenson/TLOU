import { api, ok, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';

export const POST = api(async (req, ctx) => {
  const user = await apiUser('owner');
  const { id } = await ctx.params;
  const l = /^\d+$/.test(id) ? await db.get('SELECT * FROM leaves WHERE id=?', [id]) : undefined;
  if (l) { await db.run('DELETE FROM leaves WHERE id=?', [l.id]); await audit({ user, ip: clientIp(req) }, 'leave.remove', 'leave', l.id, l); }
  return ok();
});
