import { api, ok, fail, form } from '@/lib/http';
import { apiUser, isOwner } from '@/lib/auth';
import { db } from '@/lib/db';
import { moveToTrash } from '@/lib/queries/trash';

/**
 * Moves one or more expenses (`ids` = comma-separated) to the Trash / Delete Archive; nothing is erased. They drop out of every list and
 * total until restored. The owner / admin can delete any; a staff member only their own - ids that are not theirs are treated as missing.
 */
export const POST = api(async (req) => {
  const user = await apiUser('expenses');
  const { b } = await form(req);
  const ids = [...new Set(String(b.ids ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 500);
  if (!ids.length) return fail('Select at least one expense.');
  const rows = await db.all(`SELECT * FROM expenses WHERE status='Valid' AND id IN (${ids.map(() => '?').join(',')}) ${isOwner(user) ? '' : 'AND user_id=?'}`, isOwner(user) ? ids : [...ids, user.id]);
  if (!rows.length || (!isOwner(user) && rows.length !== ids.length)) return fail('Expense not found.', 404);
  await moveToTrash('expense', rows, user, req);
  return ok(rows.length === 1 ? 'Expense deleted.' : `${rows.length} expenses deleted.`);
});
