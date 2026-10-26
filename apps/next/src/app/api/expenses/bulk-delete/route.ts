import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now } from '@/lib/util';

/**
 * Delete one or more expenses from Monitoring Finances (`ids` = comma-separated). Like the Expenses page's void, they stay
 * on record (status Voided, audit-logged) but drop out of every list and total.
 */
export const POST = api(async (req) => {
  const user = await apiUser('owner');
  const { b } = await form(req);
  const ids = [...new Set(String(b.ids ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 500);
  if (!ids.length) return fail('Select at least one expense.');
  const rows = await db.all(`SELECT id, amount FROM expenses WHERE status='Valid' AND id IN (${ids.map(() => '?').join(',')})`, ids);
  if (!rows.length) return fail('Expense not found.', 404);
  await db.run(`UPDATE expenses SET status='Voided', void_reason='Deleted from Monitoring Finances', updated_by=?, updated_at=? WHERE id IN (${rows.map(() => '?').join(',')})`, [user.id, now(), ...rows.map((r: any) => r.id)]);
  for (const r of rows) await audit({ user, ip: clientIp(req) }, 'expense.delete', 'expense', r.id, { amount: r.amount });
  return ok(rows.length === 1 ? 'Expense deleted.' : `${rows.length} expenses deleted.`);
});
