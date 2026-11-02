import { api } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendStored } from '@/lib/files';

export const GET = api(async (req, ctx) => {
  await apiUser('expenses');
  const { id } = await ctx.params;
  const e = await db.get('SELECT receipt FROM expenses WHERE id=?', [id]);
  // Everyone with expense access can open any expense's receipt (they can only change their own expenses).
  if (!e || !e.receipt) return new Response('Not found', { status: 404 });
  const n = await db.get(`SELECT body FROM notes WHERE entity='expense_file' AND entity_id=?`, [id]);
  return sendStored(e.receipt, n ? n.body : e.receipt, req.nextUrl.searchParams.get('inline') === '1');
});
