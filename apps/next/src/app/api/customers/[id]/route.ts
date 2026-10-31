import { api, ok, fail, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { custInput } from '@/lib/queries/core';

export const POST = api(async (req, ctx) => {
  const user = await apiUser();
  const { id } = await ctx.params;
  const old = await db.get('SELECT * FROM customers WHERE id=?', [id]);
  if (!old) return fail('Customer not found.', 404);
  const { b } = await form(req);
  const { c, errors } = custInput(b);
  if (!errors.phone && c.phone && await db.get('SELECT 1 FROM customers WHERE phone=? AND id<>?', [c.phone, old.id])) errors.phone = 'Another customer already has this number.';
  if (!errors.email && c.email && await db.get('SELECT 1 FROM customers WHERE email=? AND id<>?', [c.email, old.id])) errors.email = 'Another customer already has this email.';
  if (Object.keys(errors).length) return invalid(errors);
  await db.run('UPDATE customers SET name=?,phone=?,email=?,pref_contact=?,notes=? WHERE id=?', [c.name, c.phone, c.email, c.pref_contact, c.notes, old.id]);
  await audit({ user, ip: clientIp(req) }, 'customer.update', 'customer', old.id, { before: old, after: c });
  return ok('Customer saved.', { id: old.id });
});
