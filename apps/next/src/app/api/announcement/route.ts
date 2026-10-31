import { api, ok, form, clientIp } from '@/lib/http';
import { apiUser, isOwner, HttpError } from '@/lib/auth';
import { tx } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now, str } from '@/lib/util';
import { MAX_PINNED } from '@/lib/queries/announcement';

// Announcements are posts. Anyone can post; only the owner / admin can edit, remove, pin and unpin - and at most MAX_PINNED
// posts can be pinned at once (checked inside a transaction on the server, not just in the buttons).
// `action`: save (new post, or edit when `id` is given; owners can tick `pin`) | pin | unpin | delete.
export const POST = api(async (req) => {
  const user = await apiUser();
  const { b } = await form(req);
  const owner = isOwner(user), action = String(b.action || 'save'), id = /^\d+$/.test(String(b.id ?? '')) ? Number(b.id) : 0;
  const meta = { user, ip: clientIp(req) };
  if (action !== 'save' && !owner) throw new HttpError(403, 'Only the owner or an admin can change announcements.');
  if (action === 'save' && id && !owner) throw new HttpError(403, 'Only the owner or an admin can edit an announcement.');

  const msg = await tx(async (d) => {
    // Locks the pinned rows so two simultaneous pins cannot both succeed.
    const pinnedCount = async (except = 0) => (await d.all('SELECT id FROM announcement_posts WHERE pinned=1 AND deleted_at IS NULL AND id<>? FOR UPDATE', [except])).length;
    const tooMany = () => new HttpError(400, `Only ${MAX_PINNED} announcements can be pinned at a time. Unpin one first.`);
    const post = id ? await d.get('SELECT * FROM announcement_posts WHERE id=? AND deleted_at IS NULL', [id]) : undefined;
    if (action !== 'save' && !post) throw new HttpError(404, 'That announcement no longer exists.');
    if (action === 'save' && id && !post) throw new HttpError(404, 'That announcement no longer exists.');

    if (action === 'pin') {
      if (post!.pinned) return 'Already pinned.';
      if ((await pinnedCount()) >= MAX_PINNED) throw tooMany();
      await d.run('UPDATE announcement_posts SET pinned=1, pinned_at=? WHERE id=?', [now(), id]);
      await audit(meta, 'announcement.pin', 'announcement', id, {});
      return 'Announcement pinned.';
    }
    if (action === 'unpin') {
      await d.run('UPDATE announcement_posts SET pinned=0, pinned_at=NULL WHERE id=?', [id]);
      await audit(meta, 'announcement.unpin', 'announcement', id, {});
      return 'Announcement unpinned.';
    }
    if (action === 'delete') {
      await d.run('UPDATE announcement_posts SET deleted_at=?, pinned=0, pinned_at=NULL WHERE id=?', [now(), id]);
      await audit(meta, 'announcement.delete', 'announcement', id, {});
      return 'Announcement removed.';
    }
    if (action !== 'save') throw new HttpError(400, 'Unknown action.');

    const text = str(b.text, 1000);
    if (!text) throw new HttpError(400, 'Write a message first.');
    const wantPin = owner && b.pin === '1';
    if (post) {
      if (wantPin && !post.pinned && (await pinnedCount()) >= MAX_PINNED) throw tooMany();
      await d.run('UPDATE announcement_posts SET body=?, updated_at=?, pinned=?, pinned_at=? WHERE id=?',
        [text, now(), wantPin ? 1 : 0, wantPin ? post.pinned_at ?? now() : null, id]);
      await audit(meta, 'announcement.update', 'announcement', id, { pinned: wantPin });
      return 'Announcement saved.';
    }
    if (wantPin && (await pinnedCount()) >= MAX_PINNED) throw tooMany();
    const r = await d.run('INSERT INTO announcement_posts (body,user_id,user_name,created_at,pinned,pinned_at) VALUES (?,?,?,?,?,?)',
      [text, user.id, user.name, now(), wantPin ? 1 : 0, wantPin ? now() : null]);
    await audit(meta, 'announcement.create', 'announcement', r.id, { pinned: wantPin });
    return wantPin ? 'Announcement posted and pinned.' : 'Announcement posted.';
  });
  return ok(msg);
});
