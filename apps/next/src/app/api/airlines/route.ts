import { api, ok, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now } from '@/lib/util';
import { airlineInput } from '@/lib/queries/airlines';

export const POST = api(async (req) => {
  const user = await apiUser('owner');
  const { b } = await form(req);
  const { a, errors } = airlineInput(b);
  if (!errors.name && await db.get('SELECT 1 FROM airlines WHERE name=?', [a.name])) errors.name = 'This airline is already in the list.';
  if (Object.keys(errors).length) return invalid(errors);
  const id = (await db.run('INSERT INTO airlines (name,code,active,created_by,created_at) VALUES (?,?,?,?,?)', [a.name, a.code || null, a.active, user.id, now()])).id;
  await audit({ user, ip: clientIp(req) }, 'airline.create', 'airline', id, a);
  return ok(`${a.name} added. It is now available in Airfare Sales.`);
});
