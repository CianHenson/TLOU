import { api, ok, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { tx } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now, today } from '@/lib/util';
import { bookingInput } from '@/lib/queries/core';

export const POST = api(async (req) => {
  const user = await apiUser();
  const { b } = await form(req);
  const { v, e } = await bookingInput(b);
  if (Object.keys(e).length) return invalid(e);
  const id = await tx(async (d) => {
    const i = (await d.run(`INSERT INTO bookings (customer_id,request_id,service_type,supplier,details,supplier_cost,selling_price,service_fee,discount,status,assigned_to,confirmation_ref,remarks,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [v.customer_id, v.request_id, v.service_type, v.supplier, v.details, v.supplier_cost, v.selling_price, v.service_fee, v.discount, v.status, v.assigned_to, v.confirmation_ref, v.remarks, now()])).id;
    await d.run('UPDATE bookings SET ref=? WHERE id=?', [`BK-${today().slice(0, 4)}-${String(i).padStart(5, '0')}`, i]);
    return i;
  });
  await audit({ user, ip: clientIp(req) }, 'booking.create', 'booking', id, v);
  return ok(undefined, { redirect: '/app/bookings/' + id });
});
