// Trash (staff) and Delete Archive (owner / admin). Deleting an airfare sale or an expense never erases it: the row moves to the `trash`
// table as a JSON snapshot and can be put back. Staff see only what they deleted themselves, for TRASH_DAYS days, and can restore it or
// remove it from their view for good ("delete permanently"); after that it stays in the owner's Delete Archive, which only offers Restore.
import 'server-only';
import { db, tx } from '../db';
import { audit } from '../biz';
import { clientIp, fail, ok } from '../http';
import { isOwner, type SessionUser } from '../auth';
import { addDays, diffMin, now, today } from '../util';
import type { Row } from '../types';

export const TRASH_DAYS = 30;
export type TrashKind = 'airfare' | 'expense';

const KINDS: Record<TrashKind, { table: string; type: string; label: (r: Row) => string; detail: (r: Row) => string; amount: (r: Row) => number }> = {
  airfare: {
    table: 'airfare_sales', type: 'Airfare sale', label: (r) => `${r.passenger} · PNR ${r.pnr}`,
    detail: (r) => `${r.airline} · ${r.origin} → ${r.destination} · travel ${r.travel_date}`, amount: (r) => Number(r.total_amount),
  },
  expense: {
    table: 'expenses', type: 'Expense', label: (r) => String(r.category),
    detail: (r) => `${r.spent_at}${r.description ? ` · ${r.description}` : ''}`, amount: (r) => Number(r.amount),
  },
};
export const KIND_LABEL: Record<string, string> = { airfare: KINDS.airfare.type, expense: KINDS.expense.type };

/** Moves the given rows (already loaded from their table) to the trash, recorded against `user`. */
export async function moveToTrash(kind: TrashKind, rows: Row[], user: SessionUser, req: Request) {
  const k = KINDS[kind], at = now();
  await tx(async (d) => {
    for (const r of rows) {
      await d.run('INSERT INTO trash (kind,entity_id,label,detail,amount,data,deleted_by,deleted_role,deleted_at) VALUES (?,?,?,?,?,?,?,?,?)',
        [kind, r.id, k.label(r).slice(0, 200), k.detail(r).slice(0, 300), k.amount(r), JSON.stringify(r), user.id, user.role, at]);
      await d.run(`DELETE FROM ${k.table} WHERE id=?`, [r.id]);
    }
  });
  for (const r of rows) await audit({ user, ip: clientIp(req) }, `${kind}.delete`, kind, r.id, { label: k.label(r), trashed: true });
}

/** Whole days a staff member still has to restore a record deleted at `deletedAt` (0 = expires today). */
export const daysLeft = (deletedAt: string) => Math.max(0, Math.ceil((TRASH_DAYS * 1440 - diffMin(deletedAt, now())) / 1440));

/** Oldest deleted_at a record can have and still be in its owner's Trash. */
export const trashCutoff = () => `${addDays(today(), -TRASH_DAYS)} ${now().slice(11)}`;

/** What the staff member can still see in their Trash: their own deletions, not hidden or restored, newer than TRASH_DAYS. */
export const staffTrash = (uid: number) => db.all(
  `SELECT * FROM trash WHERE deleted_by=? AND deleted_role='employee' AND hidden_at IS NULL AND restored_at IS NULL AND deleted_at>=? ORDER BY id DESC`, [uid, trashCutoff()]);

/** Puts a trashed record back in its table. Staff may only restore their own, within TRASH_DAYS; the owner / admin may restore any. */
export async function restoreFromTrash(id: string, user: SessionUser, req: Request) {
  const t = /^\d+$/.test(id) ? await db.get('SELECT * FROM trash WHERE id=? AND restored_at IS NULL', [id]) : undefined;
  if (!t) return fail('That record is not in the trash.', 404);
  if (!isOwner(user)) {
    if (t.deleted_by !== user.id || t.deleted_role !== 'employee' || t.hidden_at) return fail('That record is not in your trash.', 404);
    if (t.deleted_at < trashCutoff()) return fail(`This record was deleted more than ${TRASH_DAYS} days ago. Please ask the owner or an admin to restore it.`);
  }
  const k = KINDS[t.kind as TrashKind];
  if (!k) return fail('Unknown record type.');
  const data = JSON.parse(t.data) as Row;
  const cols = Object.keys(data).filter((c) => /^[a-z_]+$/.test(c));
  if (await db.get(`SELECT 1 FROM ${k.table} WHERE id=?`, [t.entity_id])) return fail('This record already exists again.');
  await tx(async (d) => {
    await d.run(`INSERT INTO ${k.table} (${cols.join(',')}) VALUES (${cols.map(() => '?').join(',')})`, cols.map((c) => data[c]));
    await d.run('UPDATE trash SET restored_at=?, restored_by=? WHERE id=?', [now(), user.id, t.id]);
  });
  await audit({ user, ip: clientIp(req) }, `${t.kind}.restore`, t.kind, t.entity_id, { label: t.label });
  return ok(`${k.type} restored: ${t.label}.`);
}

/** Staff "delete permanently": hides the record from their own Trash. It is kept, and stays in the owner's Delete Archive. */
export async function hideFromTrash(id: string, user: SessionUser, req: Request) {
  const t = /^\d+$/.test(id) ? await db.get(`SELECT * FROM trash WHERE id=? AND deleted_by=? AND deleted_role='employee' AND hidden_at IS NULL AND restored_at IS NULL`, [id, user.id]) : undefined;
  if (!t) return fail('That record is not in your trash.', 404);
  await db.run('UPDATE trash SET hidden_at=? WHERE id=?', [now(), t.id]);
  await audit({ user, ip: clientIp(req) }, 'trash.purge', t.kind, t.entity_id, { label: t.label });
  return ok('Removed from your trash.');
}

/** Restore (or, for staff, "delete permanently") several trashed records at once; records the user may not touch are skipped and counted. */
export async function bulkTrash(action: 'restore' | 'purge', ids: string[], user: SessionUser, req: Request) {
  let done = 0, skipped = 0;
  for (const id of ids) {
    const r = action === 'restore' ? await restoreFromTrash(id, user, req) : await hideFromTrash(id, user, req);
    if (r.ok) done++; else skipped++;
  }
  const verb = action === 'restore' ? 'restored' : 'removed from your trash';
  if (!done) return fail(`Nothing was ${verb}: those records are no longer available to you.`);
  return ok(`${done} ${done === 1 ? 'record' : 'records'} ${verb}${skipped ? ` (${skipped} could not be ${action === 'restore' ? 'restored' : 'removed'})` : ''}.`);
}
