import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit, EXPENSE_CATS, METHODS } from '@/lib/biz';
import { saveUpload } from '@/lib/files';
import { toCents, str, isDate, today, now } from '@/lib/util';

/** Edit a recorded expense (Monitoring Finances). A new receipt replaces the old one; no file keeps the current receipt. */
export const POST = api(async (req, ctx) => {
  const user = await apiUser('owner');
  const { id } = await ctx.params;
  const e = await db.get('SELECT * FROM expenses WHERE id=?', [id]);
  if (!e || e.status !== 'Valid') return fail('Expense not found.', 404);
  const { b } = await form(req);
  const amt = toCents(b.amount), date = str(b.spent_at, 10) || today();
  const category = String(b.category ?? ''), method = String(b.method ?? '');
  const err = !Number.isFinite(amt) || amt <= 0 ? 'Enter a valid amount.' : !isDate(date) || date > today() ? 'Enter a valid date (not in the future).'
    : !EXPENSE_CATS.includes(category) ? 'Choose a category.' : !METHODS.includes(method) ? 'Choose a payment method.' : !str(b.description) ? 'Add a description.' : null;
  if (err) return fail(err);
  const up = await saveUpload(b.receipt);
  if (up && 'error' in up) return fail(up.error);
  await db.run('UPDATE expenses SET spent_at=?, category=?, amount=?, method=?, description=?, receipt=?, updated_by=?, updated_at=? WHERE id=?',
    [date, category, amt, method, str(b.description, 500), up ? up.stored : e.receipt, user.id, now(), e.id]);
  if (up) {
    await db.run(`DELETE FROM notes WHERE entity='expense_file' AND entity_id=?`, [e.id]);
    await db.run(`INSERT INTO notes (entity,entity_id,body,user_id,at) VALUES ('expense_file',?,?,?,?)`, [e.id, up.original.slice(0, 200), user.id, now()]);
  }
  await audit({ user, ip: clientIp(req) }, 'expense.edit', 'expense', e.id, { before: { amount: e.amount, category: e.category, spent_at: e.spent_at }, after: { amount: amt, category, spent_at: date } });
  return ok('Expense updated.');
});
