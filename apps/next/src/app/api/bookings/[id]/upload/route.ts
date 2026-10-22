import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { saveUpload } from '@/lib/files';
import { now } from '@/lib/util';

export const POST = api(async (req, ctx) => {
  const user = await apiUser();
  const { id } = await ctx.params;
  const bk = await db.get('SELECT id,ref FROM bookings WHERE id=?', [id]);
  if (!bk) return fail('Booking not found.', 404);
  const { b } = await form(req);
  const up = await saveUpload(b.file);
  if (!up) return fail('Choose a file to upload.');
  if ('error' in up) return fail(up.error);
  await db.run('INSERT INTO documents (booking_id,stored,original,user_id,at) VALUES (?,?,?,?,?)', [bk.id, up.stored, up.original, user.id, now()]);
  await audit({ user, ip: clientIp(req) }, 'document.upload', 'booking', bk.id, up.original.slice(0, 100));
  return ok('Document uploaded.');
});
