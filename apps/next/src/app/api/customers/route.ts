import { api, ok, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db, tx } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now } from '@/lib/util';
import { custInput, newCode } from '@/lib/queries/core';

export const POST = api(async (req) => {
  const user = await apiUser();
  const { b } = await form(req);
  const { c, errors } = custInput(b);
  if (!errors.phone && c.phone && await db.get('SELECT code FROM customers WHERE phone=?', [c.phone])) errors.phone = 'A customer with this number already exists.';
  if (!errors.email && c.email && await db.get('SELECT code FROM customers WHERE email=?', [c.email])) errors.email = 'A customer with this email already exists.';
  if (Object.keys(errors).length) return invalid(errors);
  const id = await tx(async (d) => {
    const i = (await d.run('INSERT INTO customers (name,phone,email,pref_contact,notes,created_at) VALUES (?,?,?,?,?,?)', [c.name, c.phone, c.email, c.pref_contact, c.notes, now()])).id;
    await d.run('UPDATE customers SET code=? WHERE id=?', [newCode(i), i]);
    return i;
  });
  await audit({ user, ip: clientIp(req) }, 'customer.create', 'customer', id, c.name);
  return ok(`${c.name} added to Customers.`, { id });
});
