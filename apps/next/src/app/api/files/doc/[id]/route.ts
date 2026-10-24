import { api, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { sendStored } from '@/lib/files';

export const GET = api(async (req, ctx) => {
  const user = await apiUser();
  const { id } = await ctx.params;
  const d = await db.get('SELECT * FROM documents WHERE id=?', [id]);
  if (!d) return new Response('Not found', { status: 404 });
  await audit({ user, ip: clientIp(req) }, 'document.download', 'booking', d.booking_id, d.original);
  return sendStored(d.stored, d.original);
});
