import { api } from '@/lib/http';
import { apiUser, isOwner } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendStored } from '@/lib/files';

export const GET = api(async (req, ctx) => {
  const user = await apiUser('expenses');
  const { id } = await ctx.params;
  const e = await db.get('SELECT receipt, user_id FROM expenses WHERE id=?', [id]);
  // Staff can open receipts of their own expenses only.
  if (!e || !e.receipt || (!isOwner(user) && e.user_id !== user.id)) return new Response('Not found', { status: 404 });
  const n = await db.get(`SELECT body FROM notes WHERE entity='expense_file' AND entity_id=?`, [id]);
  return sendStored(e.receipt, n ? n.body : e.receipt, req.nextUrl.searchParams.get('inline') === '1');
});
