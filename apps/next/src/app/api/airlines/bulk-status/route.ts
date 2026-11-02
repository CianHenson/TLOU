import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now } from '@/lib/util';

/** Owner only: activate (`active=1`) or deactivate (`active=0`) one or more airlines (`ids` = comma-separated). Existing sales keep the airline name. */
export const POST = api(async (req) => {
  const user = await apiUser('owner');
  const { b } = await form(req);
  const active = String(b.active) === '1' ? 1 : 0;
  const ids = [...new Set(String(b.ids ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 500);
  if (!ids.length) return fail('Select at least one airline.');
  const rows = await db.all<{ id: number; name: string }>(`SELECT id,name FROM airlines WHERE active!=? AND id IN (${ids.map(() => '?').join(',')})`, [active, ...ids]);
  if (!rows.length) return ok(active ? 'Already active.' : 'Already deactivated.');
  await db.run(`UPDATE airlines SET active=?, updated_at=? WHERE id IN (${rows.map(() => '?').join(',')})`, [active, now(), ...rows.map((r) => r.id)]);
  for (const r of rows) await audit({ user, ip: clientIp(req) }, active ? 'airline.activate' : 'airline.deactivate', 'airline', r.id, { name: r.name });
  const n = rows.length;
  return ok(`${n} ${n === 1 ? 'airline' : 'airlines'} ${active ? 'activated' : 'deactivated'}.`);
});
