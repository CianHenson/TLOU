import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { str } from '@/lib/util';

export const POST = api(async (req, ctx) => {
  const user = await apiUser('owner');
  const { id } = await ctx.params;
  const e = await db.get('SELECT * FROM expenses WHERE id=?', [id]);
  if (!e) return fail('Expense not found.', 404);
  const { b } = await form(req);
  const reason = str(b.reason, 500);
  if (!reason) return fail('A reason is required to void an expense.');
  await db.run(`UPDATE expenses SET status='Voided', void_reason=? WHERE id=?`, [reason, e.id]);
  await audit({ user, ip: clientIp(req) }, 'expense.void', 'expense', e.id, { amount: e.amount, reason });
  return ok('Expense voided (kept on record, excluded from totals).');
});
