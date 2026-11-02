import { api, ok, fail, form } from '@/lib/http';
import { apiUser, isOwner } from '@/lib/auth';
import { db } from '@/lib/db';
import { moveToTrash } from '@/lib/queries/trash';

/**
 * Moves one or more sales (`ids` = comma-separated) to the Trash / Delete Archive; nothing is erased. The owner / admin can delete any;
 * a staff member only the sales they added - ids that are not theirs are treated as missing.
 */
export const POST = api(async (req) => {
  const user = await apiUser();
  const { b } = await form(req);
  const ids = [...new Set(String(b.ids ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 500);
  if (!ids.length) return fail('Select at least one sale.');
  const rows = await db.all(`SELECT * FROM airfare_sales WHERE id IN (${ids.map(() => '?').join(',')}) ${isOwner(user) ? '' : 'AND user_id=?'}`, isOwner(user) ? ids : [...ids, user.id]);
  if (!rows.length || (!isOwner(user) && rows.length !== ids.length)) return fail('Sale not found.', 404);
  await moveToTrash('airfare', rows, user, req);
  return ok(rows.length === 1 ? 'Airfare sale deleted.' : `${rows.length} airfare sales deleted.`);
});
