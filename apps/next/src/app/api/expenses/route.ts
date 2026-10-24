import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit, EXPENSE_CATS, METHODS } from '@/lib/biz';
import { saveUpload } from '@/lib/files';
import { toCents, str, isDate, today, now } from '@/lib/util';

export const POST = api(async (req) => {
  const user = await apiUser('expenses');
  const { b } = await form(req);
  const amt = toCents(b.amount), date = str(b.spent_at, 10) || today();
  const category = String(b.category ?? ''), method = String(b.method ?? '');
  const err = !Number.isFinite(amt) || amt <= 0 ? 'Enter a valid amount.' : !isDate(date) || date > today() ? 'Enter a valid date (not in the future).'
    : !EXPENSE_CATS.includes(category) ? 'Choose a category.' : !METHODS.includes(method) ? 'Choose a payment method.' : !str(b.description) ? 'Add a description.' : null;
  if (err) return fail(err);
  const up = await saveUpload(b.receipt);
  if (up && 'error' in up) return fail(up.error);
  const id = (await db.run('INSERT INTO expenses (spent_at,category,amount,method,description,receipt,user_id,created_at) VALUES (?,?,?,?,?,?,?,?)',
    [date, category, amt, method, str(b.description, 500), up ? up.stored : null, user.id, now()])).id;
  if (up) await db.run(`INSERT INTO notes (entity,entity_id,body,user_id,at) VALUES ('expense_file',?,?,?,?)`, [id, up.original.slice(0, 200), user.id, now()]);
  await audit({ user, ip: clientIp(req) }, 'expense.create', 'expense', id, { amount: amt, category });
  return ok('Expense recorded.');
});
