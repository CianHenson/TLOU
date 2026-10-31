import { api, ok, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { tx } from '@/lib/db';
import { audit, METHODS } from '@/lib/biz';
import { toCents, peso, str, isDate, today, now, intOrNull } from '@/lib/util';
import { loadBooking } from '@/lib/queries/core';

/** Record a payment or refund against a booking (the same rules the booking screen used): amount > 0, not in the future, refund <= net paid. */
export const POST = api(async (req) => {
  const user = await apiUser();
  const { b } = await form(req);
  const bk = intOrNull(b.booking_id) ? await loadBooking(intOrNull(b.booking_id)!) : undefined;
  const kind = b.kind === 'Refund' ? 'Refund' : 'Payment';
  const amt = toCents(b.amount), date = str(b.paid_at, 10) || today(), method = String(b.method ?? '');
  const errors: Record<string, string> = {};
  if (!bk) errors.booking_id = 'Choose a booking.';
  if (!Number.isFinite(amt) || amt <= 0 || amt > 1e11) errors.amount = 'Enter an amount greater than zero.';
  if (!isDate(date) || date > today()) errors.paid_at = 'Enter a valid date (not in the future).';
  if (!METHODS.includes(method)) errors.method = 'Choose a payment method.';
  if (Object.keys(errors).length) return invalid(errors);
  if (bk!.status === 'Cancelled' && kind === 'Payment') return invalid({ booking_id: 'This booking is cancelled; only refunds can be recorded.' });
  if (kind === 'Refund' && amt > bk!.paid) return invalid({ amount: `A refund cannot exceed the net amount paid (${peso(bk!.paid)}).` });
  const pid = await tx(async (d) => {
    const i = (await d.run('INSERT INTO payments (booking_id,customer_id,paid_at,amount,method,reference,kind,remarks,user_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)',
      [bk!.id, bk!.customer_id, date, amt, method, str(b.reference, 80), kind, str(b.remarks, 500), user.id, now()])).id;
    await d.run('UPDATE payments SET ref=? WHERE id=?', [`PAY-${String(i).padStart(6, '0')}`, i]);
    return i;
  });
  await audit({ user, ip: clientIp(req) }, 'payment.' + kind.toLowerCase(), 'payment', pid, { booking: bk!.ref, amount: amt });
  return ok(`${kind} of ${peso(amt)} recorded.`);
});
