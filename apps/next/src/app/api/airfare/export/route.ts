import { api, csv } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { flat } from '@/lib/list';
import { hm12, plain } from '@/lib/util';
import { airfareQuery } from '@/lib/queries/airfare';

/** CSV in the client's sheet column order (+ computed airline fare and agency income). */
export const GET = api(async (req) => {
  await apiUser();
  const q = flat(Object.fromEntries(req.nextUrl.searchParams));
  const [sql, p] = airfareQuery(q);
  const rows = await db.all(sql, p);
  return csv('airfare-sales', ['Transaction Date', 'Airline Name', 'Airline PNR', 'PAX', 'Passenger', 'Contact Number', 'Email Address / FB Account', 'Origin',
    'Destination', 'Travel Date', 'Time', 'Status for Check In', 'Airline ID / Flight No.', 'Total Amount', 'Service Charge', 'Credit Card / Debit Card Fee',
    'Remarks', 'Airline Fare', 'Agency Income', 'Recorded by'],
  rows.map((r) => [r.txn_date, r.airline, r.pnr, r.pax, r.passenger, r.contact, r.email_fb, r.origin, r.destination, r.travel_date, hm12(r.travel_time),
    r.checkin_status, r.flight_no, plain(r.total_amount), plain(r.service_charge), plain(-r.card_fee), r.remarks,
    plain(r.total_amount - r.service_charge), plain(r.service_charge - r.card_fee), r.recorder]));
});
