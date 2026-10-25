// Passenger airfare sales: list query (page + CSV export), form parsing and period summary. Server-only.
//  * total_amount = what the customer pays (airline fare + service charge).
//  * Airline fare = total_amount - service_charge.
//  * Agency income = service_charge - card_fee (the client's sheet: "include only the SC amount, exclude the portal fee").
//  * Cancelled sales are listed but excluded from every total.
import 'server-only';
import { db } from '../db';
import { where } from '../list';
import { CHECKIN_STATUSES } from '../types';
import { addDays, isDate, now, str, toCents, today } from '../util';

export function airfareQuery(q: Record<string, string>): [string, unknown[]] {
  const w = where();
  if (q.q) { const l = `%${str(q.q, 60)}%`; w.add('(a.passenger LIKE ? OR a.pnr LIKE ? OR a.flight_no LIKE ? OR a.contact LIKE ?)', l, l, l, l); }
  if (q.airline) w.add('a.airline=?', str(q.airline, 80));
  if (CHECKIN_STATUSES.includes(q.status)) w.add('a.checkin_status=?', q.status);
  const col = q.by === 'travel' ? 'a.travel_date' : 'a.txn_date';
  if (isDate(q.from)) w.add(`${col}>=?`, q.from);
  if (isDate(q.to)) w.add(`${col}<=?`, q.to);
  const order = q.by === 'travel' ? 'a.travel_date ASC, a.travel_time ASC' : 'a.txn_date DESC, a.id DESC';
  return [`SELECT a.*, u.name AS recorder FROM airfare_sales a LEFT JOIN users u ON u.id=a.user_id ${w.sql} ORDER BY ${order}`, w.p];
}

/** Totals for any airfare SELECT (wrap the list query). */
export const airfareTotals = async (sql: string, p: unknown[]) => (await db.get(`SELECT COUNT(*) AS n, COALESCE(SUM(x.pax),0) AS pax,
    COALESCE(SUM(x.total_amount),0) AS total, COALESCE(SUM(x.service_charge),0) AS sc, COALESCE(SUM(x.card_fee),0) AS fee
  FROM (${sql}) AS x WHERE x.checkin_status!='Cancelled'`, p))!;

/** Period summary by transaction date, for the dashboard and Finance Monitoring. */
export async function airfareSummary(from: string, to: string) {
  const t = await airfareTotals(`SELECT * FROM airfare_sales WHERE txn_date BETWEEN ? AND ?`, [from, to]);
  return { ...t, income: t.sc - t.fee } as { n: number; pax: number; total: number; sc: number; fee: number; income: number };
}

/** Flights in the next `hours` hours that still need check-in (status Pending). */
export function needsCheckin(hours = 48) {
  const n = now(), until = addDays(today(), Math.ceil(hours / 24));
  return db.all(`SELECT * FROM airfare_sales WHERE checkin_status='Pending' AND travel_date BETWEEN ? AND ?
    AND CONCAT(travel_date,' ',COALESCE(travel_time,'23:59')) >= ? ORDER BY travel_date, travel_time`, [today(), until, n.slice(0, 16)]);
}

export function airfareInput(b: Record<string, FormDataEntryValue | undefined>) {
  const money = (v: unknown) => (String(v ?? '').trim() === '' ? 0 : toCents(v));
  const a = {
    txn_date: str(b.txn_date, 10), airline: str(b.airline, 80), pnr: str(b.pnr, 20).toUpperCase(), pax: parseInt(String(b.pax ?? ''), 10),
    passenger: str(b.passenger, 255), contact: str(b.contact, 60), email_fb: str(b.email_fb, 160), origin: str(b.origin, 80), destination: str(b.destination, 80),
    travel_date: str(b.travel_date, 10), travel_time: str(b.travel_time, 5), checkin_status: String(b.checkin_status ?? 'Pending'), flight_no: str(b.flight_no, 40).toUpperCase(),
    total_amount: money(b.total_amount), service_charge: money(b.service_charge), card_fee: money(b.card_fee), remarks: str(b.remarks, 1000),
  };
  const errors: Record<string, string> = {};
  if (!isDate(a.txn_date) || a.txn_date > today()) errors.txn_date = 'Enter a valid date (not in the future).';
  if (!a.airline) errors.airline = 'Required.';
  if (!/^[A-Z0-9]{5,8}$/.test(a.pnr)) errors.pnr = '5–8 letters or numbers.';
  if (!(a.pax >= 1 && a.pax <= 99)) errors.pax = '1–99.';
  if (!a.passenger) errors.passenger = 'Required.';
  if (!a.origin) errors.origin = 'Required.';
  if (!a.destination) errors.destination = 'Required.';
  if (!isDate(a.travel_date)) errors.travel_date = 'Enter a valid date.';
  else if (isDate(a.txn_date) && a.travel_date < a.txn_date) errors.travel_date = 'Cannot be before the transaction date.';
  if (a.travel_time && !/^([01]\d|2[0-3]):[0-5]\d$/.test(a.travel_time)) errors.travel_time = 'Use HH:MM.';
  if (a.contact && !/^\+?\d{7,15}$/.test(a.contact)) errors.contact = 'Numbers only (7–15 digits), e.g. 09171234567.';
  if (!CHECKIN_STATUSES.includes(a.checkin_status)) errors.checkin_status = 'Choose a status.';
  if (!Number.isFinite(a.total_amount) || a.total_amount <= 0) errors.total_amount = 'Enter the amount the customer paid.';
  if (!Number.isFinite(a.service_charge) || a.service_charge < 0) errors.service_charge = 'Enter a valid amount.';
  else if (a.service_charge > a.total_amount) errors.service_charge = 'Cannot be more than the total amount.';
  if (!Number.isFinite(a.card_fee) || a.card_fee < 0) errors.card_fee = 'Enter a valid amount.';
  return { a, errors };
}
