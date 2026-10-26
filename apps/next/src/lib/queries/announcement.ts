// Dashboard announcement + its history (table `announcements`; the newest row is the current announcement, an empty body means "removed").
import { db } from '../db';

export type Announcement = { text: string; by: string; at: string };
export type AnnouncementLog = { id: number; body: string; by: string; at: string };

export async function getAnnouncement(): Promise<Announcement> {
  const r = await db.get('SELECT body,user_name,at FROM announcements ORDER BY id DESC LIMIT 1');
  return { text: r?.body ?? '', by: r?.user_name ?? '', at: r?.at ?? '' };
}

export async function announcementHistory(limit = 50): Promise<AnnouncementLog[]> {
  const rows = await db.all('SELECT id,body,user_name,at FROM announcements ORDER BY id DESC LIMIT ?', [limit]);
  return rows.map((r) => ({ id: r.id, body: r.body ?? '', by: r.user_name ?? '', at: r.at ?? '' }));
}
