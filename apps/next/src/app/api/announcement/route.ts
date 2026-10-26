import { api, ok, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now, str } from '@/lib/util';

// Any signed-in user (owner or employee) may post, edit or remove the dashboard announcement.
// Every change is appended to the history; saving an empty message records a removal.
export const POST = api(async (req) => {
  const user = await apiUser();
  const { b } = await form(req);
  const text = str(b.text, 1000).trim();
  await db.run('INSERT INTO announcements (body,user_id,user_name,at) VALUES (?,?,?,?)', [text, user.id, user.name, now()]);
  await audit({ user, ip: clientIp(req) }, 'announcement.update', 'announcement', null, { cleared: !text });
  return ok(text ? 'Announcement saved.' : 'Announcement removed.');
});
