import { cookies } from 'next/headers';
import { api, clientIp, fail, form, invalid, ok } from '@/lib/http';
import { tx } from '@/lib/db';
import { limited } from '@/lib/limiter';
import { parseDetails } from '@/lib/forms';
import { CONTACT_METHODS, SERVICE_TYPES } from '@/lib/types';
import { isEmail, now, rand, today } from '@/lib/util';

export const POST = api(async (req) => {
  const ip = clientIp(req);
  if (limited(`pub:${ip}`, 15, 15 * 60 * 1000)) return fail('Too many submissions. Please try again later.', 429);
  const { b } = await form(req);
  if (b.website) return ok(undefined, { redirect: '/request' }); // honeypot
  const errors: Record<string, string> = {};
  const name = String(b.name || '').trim().slice(0, 120), phone = String(b.phone || '').trim().slice(0, 40);
  const email = String(b.email || '').trim().toLowerCase().slice(0, 160), pref = String(b.pref_contact || '');
  const type = String(b.service_type || '');
  if (!name) errors.name = 'Required.';
  if (!/^[0-9+()\-\s]{7,20}$/.test(phone)) errors.phone = 'Enter a valid contact number.';
  if (!isEmail(email)) errors.email = 'Enter a valid email address.';
  if (!CONTACT_METHODS.includes(pref)) errors.pref_contact = 'Choose a contact method.';
  if (!SERVICE_TYPES.includes(type)) errors.service_type = 'Choose a service.';
  if (b.consent !== 'on') errors.consent = 'You must agree to the privacy notice.';
  const parsed = SERVICE_TYPES.includes(type) ? parseDetails(type, b) : { details: {} as Record<string, string>, errors: {} as Record<string, string> };
  for (const [k, m] of Object.entries(parsed.errors)) errors['d_' + k] = m;
  if (Object.keys(errors).length) return invalid(errors);

  const ref = await tx(async (d) => {
    const c = await d.get('SELECT id FROM customers WHERE lower(email)=?', [email]);
    let cid = c?.id as number | undefined;
    if (!cid) {
      cid = (await d.run('INSERT INTO customers (name,phone,email,pref_contact,created_at) VALUES (?,?,?,?,?)', [name, phone, email, pref, now()])).id;
      await d.run('UPDATE customers SET code=? WHERE id=?', ['CUST-' + String(cid).padStart(5, '0'), cid]);
    }
    let r: string;
    do { r = `TR-${today().replace(/-/g, '')}-${rand(4)}`; } while (await d.get('SELECT 1 FROM requests WHERE ref=?', [r]));
    const id = (await d.run('INSERT INTO requests (ref,customer_id,service_type,details,source,created_at) VALUES (?,?,?,?,?,?)',
      [r, cid, type, JSON.stringify({ ...parsed.details, contact_method: pref, contact_phone: phone }), 'Website', now()])).id;
    await d.run('INSERT INTO request_log (request_id,from_status,to_status,note,at) VALUES (?,?,?,?,?)', [id, null, 'Pending Review', 'Submitted via website', now()]);
    await d.run('INSERT INTO audit_logs (at,action,entity,entity_id,detail,ip) VALUES (?,?,?,?,?,?)', [now(), 'request.submit', 'request', String(id), r, ip]);
    return r;
  });
  (await cookies()).set('lastref', ref, { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 3600 });
  return ok(undefined, { redirect: '/request/done' });
});
