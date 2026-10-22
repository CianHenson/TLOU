import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { intOrNull, str, now } from '@/lib/util';

export const POST = api(async (req) => {
  const user = await apiUser();
  const { b } = await form(req);
  const entity = ['customer', 'request', 'booking'].includes(String(b.entity)) ? String(b.entity) : null;
  const id = intOrNull(b.entity_id), body = str(b.body, 2000);
  if (!entity || !id || !body) return fail('Write a note first.');
  await db.run('INSERT INTO notes (entity,entity_id,body,user_id,at) VALUES (?,?,?,?,?)', [entity, id, body, user.id, now()]);
  await audit({ user, ip: clientIp(req) }, 'note.add', entity, id, body.slice(0, 80));
  return ok();
});
