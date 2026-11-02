import { api, fail, form } from '@/lib/http';
import { apiUser, isOwner } from '@/lib/auth';
import { bulkTrash } from '@/lib/queries/trash';

/** Restore (`action=restore`) or, staff only, delete permanently (`action=purge`) several trashed records (`ids` = comma-separated). */
export const POST = api(async (req) => {
  const user = await apiUser();
  const { b } = await form(req);
  const action = b.action === 'purge' ? 'purge' : 'restore';
  if (action === 'purge' && isOwner(user)) return fail('Nobody can permanently delete a record. The Delete Archive only offers Restore.', 403);
  const ids = [...new Set(String(b.ids ?? '').split(',').filter((s) => /^\d+$/.test(s)))].slice(0, 500);
  if (!ids.length) return fail('Select at least one record.');
  return bulkTrash(action, ids, user, req);
});
