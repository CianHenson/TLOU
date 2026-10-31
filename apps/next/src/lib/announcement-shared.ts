// Announcement constants and types shared by the server query and the client card (no database access here).
export const MAX_PINNED = 2;
export type Post = { id: number; text: string; by: string; at: string; edited: string; pinned: boolean; pinnedAt: string; removed: boolean };

/** One list order for everyone: pinned first (most recently pinned on top), then newest first. Each post appears exactly once. */
export const byPin = (a: Post, b: Post) => Number(b.pinned) - Number(a.pinned) || (a.pinned && b.pinned ? b.pinnedAt.localeCompare(a.pinnedAt) : 0) || b.id - a.id;
