import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db, tx } from '@/lib/db';
import { audit, EXPENSE_CATS, METHODS } from '@/lib/biz';
import { isDate, now, str, toCents, today } from '@/lib/util';
import { readCsvUpload } from '@/lib/csv';
import { EXPENSE_COLS } from '@/lib/batch-cols';

/**
 * Batch Upload of expenses from a CSV file (Expenses and Monitoring Finances). Expenses are recorded under the uploader. The whole
 * file is validated first; one bad or duplicate row means nothing is imported and the rows at fault are listed.
 */
export const POST = api(async (req) => {
  const user = await apiUser('expenses');
  const { b } = await form(req);
  const csv = await readCsvUpload(b.file, EXPENSE_COLS);
  if ('error' in csv) return fail(csv.error, 422, { File: csv.error });

  const errors: Record<string, string> = {};
  const good: { date: string; category: string; amount: number; method: string; description: string }[] = [];
  const sig = (d: string, c: string, a: number, desc: string) => `${d}|${c}|${a}|${desc.toLowerCase()}`;
  const have = new Set((await db.all(`SELECT spent_at, category, amount, description FROM expenses WHERE user_id=? AND status='Valid' AND spent_at>=?`, [user.id, '2000-01-01']))
    .map((r) => sig(r.spent_at, r.category, Number(r.amount), String(r.description ?? ''))));
  const inFile = new Map<string, number>();
  for (const { line, v } of csv.rows) {
    const e: string[] = [];
    const date = v.spent_at, amount = toCents(v.amount), desc = str(v.description, 500);
    const category = EXPENSE_CATS.find((c) => c.toLowerCase() === v.category.toLowerCase()) ?? '';
    const method = METHODS.find((m) => m.toLowerCase() === v.method.toLowerCase()) ?? '';
    if (!isDate(date) || date > today()) e.push('Date must be a valid date (YYYY-MM-DD), not in the future.');
    if (!category) e.push(`Type of Expense must be one of: ${EXPENSE_CATS.join(', ')}.`);
    if (!Number.isFinite(amount) || amount <= 0) e.push('Amount must be a number above 0.');
    if (!method) e.push(`Payment Method must be one of: ${METHODS.join(', ')}.`);
    if (!desc) e.push('Description is required.');
    if (!e.length) {
      const s = sig(date, category, amount, desc);
      if (have.has(s)) e.push('This expense is already recorded (same date, type, amount and description).');
      else if (inFile.has(s)) e.push(`Duplicate of row ${inFile.get(s)} in this file.`);
      else inFile.set(s, line);
    }
    if (e.length) errors[`Row ${line}`] = e.join(' ');
    else good.push({ date, category, amount, method, description: desc });
  }
  const bad = Object.keys(errors).length;
  if (bad) return fail(`Nothing was imported: ${bad} row${bad === 1 ? ' has' : 's have'} problems. Fix the file and upload it again.`, 422, errors);

  await tx(async (d) => {
    for (const x of good) await d.run('INSERT INTO expenses (spent_at,category,amount,method,description,user_id,created_at) VALUES (?,?,?,?,?,?,?)', [x.date, x.category, x.amount, x.method, x.description, user.id, now()]);
  });
  await audit({ user, ip: clientIp(req) }, 'expense.batch', 'expense', null, { rows: good.length });
  return ok(`${good.length} expense${good.length === 1 ? '' : 's'} imported.`, { count: good.length });
});
