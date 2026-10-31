import { api, ok, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { saveUpload } from '@/lib/files';
import { now } from '@/lib/util';
import { expenseInput } from '@/lib/queries/expenses';

// Records an expense under the signed-in user (user_id is never taken from the form).
export const POST = api(async (req) => {
  const user = await apiUser('expenses');
  const { b } = await form(req);
  const { x, errors } = expenseInput(b);
  if (Object.keys(errors).length) return invalid(errors);
  const up = await saveUpload(b.receipt);
  if (up && 'error' in up) return invalid({ receipt: up.error }, up.error);
  const id = (await db.run('INSERT INTO expenses (spent_at,category,amount,method,description,receipt,user_id,created_at) VALUES (?,?,?,?,?,?,?,?)',
    [x.spent_at, x.category, x.amount, x.method, x.description, up ? up.stored : null, user.id, now()])).id;
  if (up) await db.run(`INSERT INTO notes (entity,entity_id,body,user_id,at) VALUES ('expense_file',?,?,?,?)`, [id, up.original.slice(0, 200), user.id, now()]);
  await audit({ user, ip: clientIp(req) }, 'expense.create', 'expense', id, { amount: x.amount, category: x.category });
  return ok('Expense recorded.');
});
