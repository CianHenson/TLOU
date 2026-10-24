import { api, ok, fail, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now, peso } from '@/lib/util';
import { bookingInput, loadBooking } from '@/lib/queries/core';

export const POST = api(async (req, ctx) => {
  const user = await apiUser();
  const { id } = await ctx.params;
  const old = await loadBooking(id);
  if (!old) return fail('Booking not found.', 404);
  const { b } = await form(req);
  const { v, e } = await bookingInput({ ...b, customer_id: String(old.customer_id) });
  if (Object.keys(e).length) return invalid(e);
  await db.run(`UPDATE bookings SET request_id=?,service_type=?,supplier=?,details=?,supplier_cost=?,selling_price=?,service_fee=?,discount=?,status=?,assigned_to=?,confirmation_ref=?,remarks=?,updated_at=? WHERE id=?`,
    [v.request_id, v.service_type, v.supplier, v.details, v.supplier_cost, v.selling_price, v.service_fee, v.discount, v.status, v.assigned_to, v.confirmation_ref, v.remarks, now(), old.id]);
  await audit({ user, ip: clientIp(req) }, 'booking.update', 'booking', old.id, {
    before: { s: old.status, cost: old.supplier_cost, price: old.selling_price, fee: old.service_fee, disc: old.discount },
    after: { s: v.status, cost: v.supplier_cost, price: v.selling_price, fee: v.service_fee, disc: v.discount },
  });
  const warn = v.status === 'Cancelled' && old.status !== 'Cancelled' && old.paid > 0;
  return ok(warn ? `Booking cancelled, but ${peso(old.paid)} was collected. Record any refund as a Refund payment so reports stay accurate.` : 'Booking saved.',
    { redirect: '/app/bookings/' + old.id });
});
