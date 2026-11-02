import { api, ok, fail } from '@/lib/http';
import { apiUser, isOwner } from '@/lib/auth';
import { db } from '@/lib/db';
import { moveToTrash } from '@/lib/queries/trash';

/** Moves a sale to the Trash / Delete Archive (never erased). Owner / admin: any sale. Staff: only the sales they added themselves. */
export const POST = api(async (req, ctx) => {
  const user = await apiUser();
  const { id } = await ctx.params;
  const old = /^\d+$/.test(id) ? await db.get(`SELECT * FROM airfare_sales WHERE id=? ${isOwner(user) ? '' : 'AND user_id=?'}`, isOwner(user) ? [id] : [id, user.id]) : undefined;
  if (!old) return fail('Sale not found.', 404);
  await moveToTrash('airfare', [old], user, req);
  return ok('Airfare sale deleted.', { redirect: '/app/airfare' });
});
