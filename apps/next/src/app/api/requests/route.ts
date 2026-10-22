import { api, ok, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db, tx } from '@/lib/db';
import { audit, SERVICE_TYPES, REQUEST_SOURCES } from '@/lib/biz';
import { parseDetails } from '@/lib/forms';
import { intOrNull, now, today, rand } from '@/lib/util';

export const POST = api(async (req) => {
  const user = await apiUser();
  const { b } = await form(req);
  const errors: Record<string, string> = {};
  const cid = intOrNull(b.customer_id);
  const cust = cid ? await db.get('SELECT * FROM customers WHERE id=?', [cid]) : undefined;
  if (!cust) errors.customer_id = 'Choose a customer (create one first if new).';
  const type = String(b.service_type ?? '');
  if (!SERVICE_TYPES.includes(type)) errors.service_type = 'Choose a service.';
  const source = REQUEST_SOURCES.includes(String(b.source)) ? String(b.source) : null;
  if (!source) errors.source = 'Choose the channel.';
  const parsed = SERVICE_TYPES.includes(type) ? parseDetails(type, b) : { details: {} as Record<string, string>, errors: {} as Record<string, string> };
  for (const [k, m] of Object.entries(parsed.errors)) errors['d_' + k] = m;
  if (Object.keys(errors).length) return invalid(errors);

  const id = await tx(async (d) => {
    let ref: string;
    do { ref = `TR-${today().replace(/-/g, '')}-${rand(4)}`; } while (await d.get('SELECT 1 FROM requests WHERE ref=?', [ref]));
    const i = (await d.run('INSERT INTO requests (ref,customer_id,service_type,details,source,assigned_to,created_at) VALUES (?,?,?,?,?,?,?)',
      [ref, cust!.id, type, JSON.stringify(parsed.details), source, user.id, now()])).id;
    await d.run('INSERT INTO request_log (request_id,from_status,to_status,note,user_id,at) VALUES (?,?,?,?,?,?)', [i, null, 'Pending Review', `Registered (${source})`, user.id, now()]);
    return i;
  });
  await audit({ user, ip: clientIp(req) }, 'request.create', 'request', id, source);
  return ok(undefined, { redirect: '/app/requests/' + id });
});
