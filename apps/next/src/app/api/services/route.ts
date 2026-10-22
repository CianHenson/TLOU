import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit, SERVICE_TYPES } from '@/lib/biz';
import { str } from '@/lib/util';

export const POST = api(async (req) => {
  const user = await apiUser('owner');
  const { b } = await form(req);
  const id = /^\d+$/.test(String(b.id ?? '')) ? Number(b.id) : null, name = str(b.name, 120), type = String(b.type ?? '');
  if (!name || !SERVICE_TYPES.includes(type)) return fail('Name and a valid request type are required.');
  const vals = [name, type, str(b.description, 600), str(b.icon, 8), b.active === 'on' ? 1 : 0, parseInt(String(b.sort ?? ''), 10) || 0];
  if (id) await db.run('UPDATE services SET name=?,type=?,description=?,icon=?,active=?,sort=? WHERE id=?', [...vals, id]);
  else await db.run('INSERT INTO services (name,type,description,icon,active,sort) VALUES (?,?,?,?,?,?)', vals);
  await audit({ user, ip: clientIp(req) }, id ? 'service.update' : 'service.create', 'service', id, name);
  return ok('Service saved.');
});
