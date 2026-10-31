import { api, ok, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now } from '@/lib/util';
import { airfareInput, airlineError } from '@/lib/queries/airfare';

export const POST = api(async (req) => {
  const user = await apiUser();
  const { b } = await form(req);
  const { a, errors } = airfareInput(b);
  if (!errors.airline) { const m = await airlineError(a.airline); if (m) errors.airline = m; }
  if (!errors.pnr && b.dup_ok !== 'on') {
    const dup = await db.get('SELECT passenger, txn_date FROM airfare_sales WHERE pnr=? LIMIT 1', [a.pnr]);
    if (dup) errors.pnr = `Already recorded for ${dup.passenger} on ${dup.txn_date}. Tick "Save even if…" to add it anyway.`;
  }
  if (Object.keys(errors).length) return invalid(errors);
  const id = (await db.run(`INSERT INTO airfare_sales (txn_date,airline,pnr,pax,passenger,contact,email_fb,origin,destination,travel_date,travel_time,
      checkin_status,flight_no,total_amount,service_charge,card_fee,remarks,user_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [a.txn_date, a.airline, a.pnr, a.pax, a.passenger, a.contact, a.email_fb, a.origin, a.destination, a.travel_date, a.travel_time || null,
      a.checkin_status, a.flight_no, a.total_amount, a.service_charge, a.card_fee, a.remarks, user.id, now()])).id;
  await audit({ user, ip: clientIp(req) }, 'airfare.create', 'airfare', id, { pnr: a.pnr, total: a.total_amount });
  // From the New sale modal (`stay`) the list just refreshes, keeping its filters.
  return ok('Airfare sale saved.', b.stay ? {} : { redirect: '/app/airfare' });
});
