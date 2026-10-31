import { api, ok, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { saveUpload } from '@/lib/files';
import { now } from '@/lib/util';
import { expenseInput, ownedExpense } from '@/lib/queries/expenses';

/** Edit an expense: the owner / admin any one, a staff member only their own. A new receipt replaces the old one; no file keeps the current receipt. */
export const POST = api(async (req, ctx) => {
  const user = await apiUser('expenses');
  const { id } = await ctx.params;
  const e = await ownedExpense(user, id);
  const { b } = await form(req);
  const { x, errors } = expenseInput(b);
  if (Object.keys(errors).length) return invalid(errors);
  const up = await saveUpload(b.receipt);
  if (up && 'error' in up) return invalid({ receipt: up.error }, up.error);
  await db.run('UPDATE expenses SET spent_at=?, category=?, amount=?, method=?, description=?, receipt=?, updated_by=?, updated_at=? WHERE id=?',
    [x.spent_at, x.category, x.amount, x.method, x.description, up ? up.stored : e.receipt, user.id, now(), e.id]);
  if (up) {
    await db.run(`DELETE FROM notes WHERE entity='expense_file' AND entity_id=?`, [e.id]);
    await db.run(`INSERT INTO notes (entity,entity_id,body,user_id,at) VALUES ('expense_file',?,?,?,?)`, [e.id, up.original.slice(0, 200), user.id, now()]);
  }
  await audit({ user, ip: clientIp(req) }, 'expense.edit', 'expense', e.id, { before: { amount: e.amount, category: e.category, spent_at: e.spent_at }, after: { amount: x.amount, category: x.category, spent_at: x.spent_at } });
  return ok('Expense updated.');
});
