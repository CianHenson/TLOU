import { api, ok, form, clientIp } from '@/lib/http';
import { apiUser, isOwner, HttpError } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now, str } from '@/lib/util';

// Two slots: pinned (owner / admin only) and regular (any signed-in user). `slot` says which one is being edited; owners can
// pin or unpin by ticking `pin`, which moves the text to the other slot. Every change is appended to the history; saving an
// empty message records a removal.
export const POST = api(async (req) => {
  const user = await apiUser();
  const { b } = await form(req);
  const text = str(b.text, 1000).trim();
  const owner = isOwner(user);
  const from = b.slot === 'pinned' ? 1 : 0;
  if (!owner && from === 1) throw new HttpError(403, 'Only the owner or an admin can change the pinned announcement.');
  const to = owner && b.pin ? 1 : 0;
  const save = (body: string, pinned: number) => db.run('INSERT INTO announcements (body,user_id,user_name,at,pinned) VALUES (?,?,?,?,?)', [body, user.id, user.name, now(), pinned]);
  if (!text) await save('', from);
  else {
    await save(text, to);
    if (to !== from && (await db.val('SELECT body FROM announcements WHERE pinned=? ORDER BY id DESC LIMIT 1', [from]))) await save('', from); // moved: empty the old slot
  }
  await audit({ user, ip: clientIp(req) }, 'announcement.update', 'announcement', null, { cleared: !text, pinned: !!to });
  return ok(text ? 'Announcement saved.' : 'Announcement removed.');
});
