import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { tx } from '@/lib/db';
import { audit, METHODS } from '@/lib/biz';
import { toCents, peso, str, isDate, today, now } from '@/lib/util';
import { loadBooking } from '@/lib/queries/core';

export const POST = api(async (req, ctx) => {
  const user = await apiUser();
  const { id } = await ctx.params;
  const bk = await loadBooking(id);
  if (!bk) return fail('Booking not found.', 404);
  const { b } = await form(req);
  const kind = b.kind === 'Refund' ? 'Refund' : 'Payment';
  const amt = toCents(b.amount), date = str(b.paid_at, 10) || today();
  const method = String(b.method ?? '');
  if (!Number.isFinite(amt) || amt <= 0 || amt > 1e11) return fail('Enter a valid amount greater than zero.');
  if (!isDate(date) || date > today()) return fail('Payment date cannot be blank or in the future.');
  if (!METHODS.includes(method)) return fail('Choose a payment method.');
  if (bk.status === 'Cancelled' && kind === 'Payment') return fail('This booking is cancelled; only refunds can be recorded.');
  if (kind === 'Refund' && amt > bk.paid) return fail(`A refund cannot exceed the net amount paid (${peso(bk.paid)}).`);
  const pid = await tx(async (d) => {
    const i = (await d.run('INSERT INTO payments (booking_id,customer_id,paid_at,amount,method,reference,kind,remarks,user_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [bk.id, bk.customer_id, date, amt, method, str(b.reference, 80), kind, str(b.remarks, 500), user.id, now()])).id;
    await d.run('UPDATE payments SET ref=? WHERE id=?', [`PAY-${String(i).padStart(6, '0')}`, i]);
    return i;
  });
  await audit({ user, ip: clientIp(req) }, 'payment.' + kind.toLowerCase(), 'payment', pid, { booking: bk.ref, amount: amt });
  return ok(`${kind} of ${peso(amt)} recorded.`);
});
