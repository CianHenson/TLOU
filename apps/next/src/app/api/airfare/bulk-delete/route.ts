import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';

/** Owner only: removes one or more wrongly entered sales (`ids` = comma-separated). Each full row is kept in the audit log. */
export const POST = api(async (req) => {
  const user = await apiUser('owner');
  const { b } = await form(req);
  const ids = [...new Set(String(b.ids ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 500);
  if (!ids.length) return fail('Select at least one sale.');
  const rows = await db.all(`SELECT * FROM airfare_sales WHERE id IN (${ids.map(() => '?').join(',')})`, ids);
  if (!rows.length) return fail('Sale not found.', 404);
  await db.run(`DELETE FROM airfare_sales WHERE id IN (${rows.map(() => '?').join(',')})`, rows.map((r: any) => r.id));
  for (const r of rows) await audit({ user, ip: clientIp(req) }, 'airfare.delete', 'airfare', r.id, r);
  return ok(rows.length === 1 ? 'Airfare sale deleted.' : `${rows.length} airfare sales deleted.`);
});
