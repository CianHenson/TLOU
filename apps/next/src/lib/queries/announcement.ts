// Dashboard announcements (table `announcement_posts`, one row per post). The owner / admin can pin up to MAX_PINNED of them;
// pinned posts always lead on every dashboard. Removed posts keep their row (deleted_at) but are never listed.
import { db } from '../db';
import type { Post } from '../announcement-shared';

export { MAX_PINNED, type Post } from '../announcement-shared';

const map = (r: Record<string, any>): Post => ({ // eslint-disable-line @typescript-eslint/no-explicit-any
  id: r.id, text: r.body ?? '', by: r.user_name ?? '', at: r.created_at ?? '', edited: r.updated_at ?? '', pinned: !!r.pinned && !r.deleted_at, pinnedAt: r.pinned_at ?? '', removed: !!r.deleted_at,
});

/** Every live post: pinned ones first (most recently pinned first), then the rest newest first. */
export async function getPosts(limit = 60): Promise<Post[]> {
  const rows = await db.all('SELECT * FROM announcement_posts WHERE deleted_at IS NULL ORDER BY pinned DESC, IF(pinned=1,pinned_at,NULL) DESC, id DESC LIMIT ?', [limit]);
  return rows.map(map);
}

/** Every announcement ever posted (newest first), including removed ones: the History dialog. */
export async function getHistory(limit = 200): Promise<Post[]> {
  return (await db.all('SELECT * FROM announcement_posts ORDER BY id DESC LIMIT ?', [limit])).map(map);
}
