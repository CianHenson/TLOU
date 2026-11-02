import { api } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { restoreFromTrash } from '@/lib/queries/trash';

/** Put a deleted record back. Staff: their own, within 30 days. Owner / admin: any record in the Delete Archive. */
export const POST = api(async (req, ctx) => {
  const user = await apiUser();
  const { id } = await ctx.params;
  return restoreFromTrash(id, user, req);
});
