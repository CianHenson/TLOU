import { api, ok, fail, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now } from '@/lib/util';
import { airlineInput } from '@/lib/queries/airlines';

/** Edit an airline, or (`toggle=1` with `active`) activate / deactivate it. Existing sales keep the name they were saved with. */
export const POST = api(async (req, ctx) => {
  const user = await apiUser('owner');
  const { id } = await ctx.params;
  const old = /^\d+$/.test(id) ? await db.get('SELECT * FROM airlines WHERE id=?', [id]) : undefined;
  if (!old) return fail('Airline not found.', 404);
  const { b } = await form(req);
  if (b.toggle === '1') {
    const active = b.active === '1' ? 1 : 0;
    await db.run('UPDATE airlines SET active=?, updated_at=? WHERE id=?', [active, now(), old.id]);
    await audit({ user, ip: clientIp(req) }, active ? 'airline.activate' : 'airline.deactivate', 'airline', old.id, { name: old.name });
    return ok(active ? `${old.name} is active again.` : `${old.name} deactivated. Existing sales keep it; it is no longer offered for new sales.`);
  }
  const { a, errors } = airlineInput(b);
  if (!errors.name && await db.get('SELECT 1 FROM airlines WHERE name=? AND id<>?', [a.name, old.id])) errors.name = 'Another airline already has this name.';
  if (Object.keys(errors).length) return invalid(errors);
  await db.run('UPDATE airlines SET name=?, code=?, active=?, updated_at=? WHERE id=?', [a.name, a.code || null, a.active, now(), old.id]);
  await audit({ user, ip: clientIp(req) }, 'airline.update', 'airline', old.id, { before: { name: old.name, code: old.code, active: old.active }, after: a });
  return ok('Airline saved.');
});
