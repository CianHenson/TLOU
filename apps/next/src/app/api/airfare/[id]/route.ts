import { api, ok, fail, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now } from '@/lib/util';
import { airfareInput } from '@/lib/queries/airfare';

export const POST = api(async (req, ctx) => {
  const user = await apiUser();
  const { id } = await ctx.params;
  const old = /^\d+$/.test(id) ? await db.get('SELECT * FROM airfare_sales WHERE id=?', [id]) : undefined;
  if (!old) return fail('Sale not found.', 404);
  const { b } = await form(req);
  const { a, errors } = airfareInput(b);
  if (Object.keys(errors).length) return invalid(errors);
  await db.run(`UPDATE airfare_sales SET txn_date=?,airline=?,pnr=?,pax=?,passenger=?,contact=?,email_fb=?,origin=?,destination=?,travel_date=?,travel_time=?,
      checkin_status=?,flight_no=?,total_amount=?,service_charge=?,card_fee=?,remarks=?,updated_at=? WHERE id=?`,
    [a.txn_date, a.airline, a.pnr, a.pax, a.passenger, a.contact, a.email_fb, a.origin, a.destination, a.travel_date, a.travel_time || null,
      a.checkin_status, a.flight_no, a.total_amount, a.service_charge, a.card_fee, a.remarks, now(), old.id]);
  await audit({ user, ip: clientIp(req) }, 'airfare.update', 'airfare', old.id, {
    before: { status: old.checkin_status, total: old.total_amount, sc: old.service_charge, fee: old.card_fee },
    after: { status: a.checkin_status, total: a.total_amount, sc: a.service_charge, fee: a.card_fee },
  });
  return ok('Airfare sale updated.', { redirect: '/app/airfare' });
});
