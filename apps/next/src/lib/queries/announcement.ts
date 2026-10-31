// Dashboard announcements + their history (table `announcements`). Two slots: the pinned one (owner / admin only) and the
// regular one (anyone). The newest row of a slot is its current text; an empty body means "removed".
import { db } from '../db';

export type Announcement = { text: string; by: string; at: string };
export type AnnouncementLog = { id: number; body: string; by: string; at: string; pinned: boolean };

async function slot(pinned: 0 | 1): Promise<Announcement> {
  const r = await db.get('SELECT body,user_name,at FROM announcements WHERE pinned=? ORDER BY id DESC LIMIT 1', [pinned]);
  return { text: r?.body ?? '', by: r?.user_name ?? '', at: r?.at ?? '' };
}

export async function getAnnouncements(): Promise<{ pinned: Announcement; regular: Announcement }> {
  const [pinned, regular] = await Promise.all([slot(1), slot(0)]);
  return { pinned, regular };
}

export async function announcementHistory(limit = 50): Promise<AnnouncementLog[]> {
  const rows = await db.all('SELECT id,body,user_name,at,pinned FROM announcements ORDER BY id DESC LIMIT ?', [limit]);
  return rows.map((r) => ({ id: r.id, body: r.body ?? '', by: r.user_name ?? '', at: r.at ?? '', pinned: !!r.pinned }));
}
