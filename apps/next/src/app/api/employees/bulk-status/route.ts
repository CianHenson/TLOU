import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';

/**
 * Owner only: activate (`active=1`) or deactivate (`active=0`) one or more accounts (`ids` = comma-separated) from User
 * Management. Deactivated users are signed out on their next request. Your own account and the owner's are never changed here.
 */
export const POST = api(async (req) => {
  const user = await apiUser('owner');
  const { b } = await form(req);
  const active = String(b.active) === '1' ? 1 : 0;
  const ids = [...new Set(String(b.ids ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0 && n !== user.id))].slice(0, 500);
  if (!ids.length) return fail(String(b.ids ?? '').split(',').map(Number).includes(user.id) ? 'You cannot deactivate your own account.' : 'Select at least one user.');
  // The owner account is never deactivated from here.
  const rows = await db.all(`SELECT id FROM users WHERE active!=? AND role!='owner' AND id IN (${ids.map(() => '?').join(',')})`, [active, ...ids]);
  if (!rows.length) return ok(active ? 'Already active.' : 'Already deactivated.');
  await db.run(`UPDATE users SET active=? WHERE id IN (${rows.map(() => '?').join(',')})`, [active, ...rows.map((r: any) => r.id)]);
  for (const r of rows) await audit({ user, ip: clientIp(req) }, active ? 'employee.activate' : 'employee.deactivate', 'user', r.id, { active });
  const n = rows.length, noun = n === 1 ? 'user' : 'users';
  return ok(`${n} ${noun} ${active ? 'activated' : 'deactivated'}.`);
});
