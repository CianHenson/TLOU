// "Modified by" column for the list tables: who last created or changed a record and when, read from the audit log (so no
// extra columns to keep in sync). Views, notes, logins and similar non-edits are ignored.
import { db } from '../db';
import type { Row } from '../types';

const NOT_EDITS = ['document.download', 'note.add', 'login', 'logout', 'login.fail', 'backup.create', 'backup.download'];

/** Adds `mod_by` (display name) and `mod_at` (Manila time 'YYYY-MM-DD HH:MM:SS') to each row; both are '' when nothing was logged. */
export async function withModified<T extends Row>(rows: T[], entity: string, key: (r: T) => string | number = (r) => r.id): Promise<(T & { mod_by: string; mod_at: string })[]> {
  const ids = [...new Set(rows.map((r) => String(key(r))))];
  const last = new Map<string, { by: string; at: string }>();
  if (ids.length) {
    const found = await db.all(
      `SELECT a.entity_id, a.at, COALESCE(u.name, a.username, '') AS who FROM audit_logs a
       JOIN (SELECT entity_id, MAX(id) AS mid FROM audit_logs WHERE entity=? AND entity_id IN (${ids.map(() => '?').join(',')}) AND action NOT IN (${NOT_EDITS.map(() => '?').join(',')}) GROUP BY entity_id) m ON m.mid=a.id
       LEFT JOIN users u ON u.id=a.user_id`, [entity, ...ids, ...NOT_EDITS]);
    for (const f of found) last.set(String(f.entity_id), { by: f.who, at: f.at });
  }
  return rows.map((r) => { const m = last.get(String(key(r))); return { ...r, mod_by: m?.by ?? '', mod_at: m?.at ?? '' }; });
}
