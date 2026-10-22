import { api, ok } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';

export const POST = api(async (_req, ctx) => {
  await apiUser('owner');
  const { id } = await ctx.params;
  if (/^\d+$/.test(id)) await db.run('UPDATE messages SET handled=1 WHERE id=?', [id]);
  return ok();
});
