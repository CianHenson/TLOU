import { api, fail } from '@/lib/http';
import { apiUser, isOwner } from '@/lib/auth';
import { hideFromTrash } from '@/lib/queries/trash';

/** Staff only: "delete permanently" removes a record from their own Trash. Nothing is erased: the owner keeps it in the Delete Archive. */
export const POST = api(async (req, ctx) => {
  const user = await apiUser();
  if (isOwner(user)) return fail('Nobody can permanently delete a record. The Delete Archive only offers Restore.', 403);
  const { id } = await ctx.params;
  return hideFromTrash(id, user, req);
});
