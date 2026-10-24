// Shared queries / validation for the customers, requests and bookings modules (ported from routes/staff.js). Server-only.
import 'server-only';
import { db } from '../db';
import { PAID_SQL, bookingSelect, decorate, BOOKING_STATUSES, SERVICE_TYPES } from '../biz';
import { toCents, intOrNull, str } from '../util';
import type { Row } from '../types';

export const staffList = () => db.all<{ id: number; name: string }>('SELECT id,name FROM users WHERE active=1 ORDER BY name');
export const customerOptions = () => db.all<{ id: number; code: string; name: string }>('SELECT id,code,name FROM customers ORDER BY name');

/** Outstanding balance of a customer `c` (confirmed/completed bookings only). */
export const custBalance = `COALESCE((SELECT SUM(GREATEST(0,(b.selling_price+b.service_fee-b.discount)-${PAID_SQL})) FROM bookings b WHERE b.customer_id=c.id AND b.status IN ('Confirmed','Completed')),0)`;
export const newCode = (id: number) => 'CUST-' + String(id).padStart(5, '0');

export const notesFor = (entity: string, id: number) =>
  db.all<{ id: number; body: string; author: string | null; at: string }>(
    `SELECT n.*, u.name AS author FROM notes n LEFT JOIN users u ON u.id=n.user_id WHERE entity=? AND entity_id=? ORDER BY n.id DESC`, [entity, id]);

export function custInput(b: Record<string, FormDataEntryValue | undefined>) {
  const c = { name: str(b.name, 120), phone: str(b.phone, 40), email: str(b.email, 160).toLowerCase(), pref_contact: str(b.pref_contact, 30), notes: str(b.notes, 2000) };
  const errors: Record<string, string> = {};
  if (!c.name) errors.name = 'Required.';
  if (!c.phone && !c.email) errors.phone = 'Provide a phone number or email.';
  if (c.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.email)) errors.email = 'Invalid email.';
  return { c, errors };
}

export async function loadBooking(id: number | string): Promise<Row | undefined> {
  const b = await db.get(`${bookingSelect} WHERE b.id=?`, [id]);
  return b && decorate(b);
}

export async function bookingInput(b: Record<string, FormDataEntryValue | undefined>) {
  const e: Record<string, string> = {};
  const v: Row = {
    customer_id: intOrNull(b.customer_id), request_id: intOrNull(b.request_id), service_type: String(b.service_type ?? ''), supplier: str(b.supplier, 160),
    details: str(b.details, 3000), confirmation_ref: str(b.confirmation_ref, 80), remarks: str(b.remarks, 2000), status: String(b.status ?? ''),
    assigned_to: intOrNull(b.assigned_to),
  };
  for (const k of ['supplier_cost', 'selling_price', 'service_fee', 'discount']) {
    const raw = b[k];
    const c = raw === '' || raw == null ? 0 : toCents(raw);
    if (!Number.isFinite(c) || c < 0 || c > 1e11) e[k] = 'Enter an amount of 0 or more.'; else v[k] = c;
  }
  if (!v.customer_id || !(await db.get('SELECT 1 FROM customers WHERE id=?', [v.customer_id]))) e.customer_id = 'Choose a customer.';
  if (!SERVICE_TYPES.includes(v.service_type)) e.service_type = 'Choose a service type.';
  if (!BOOKING_STATUSES.includes(v.status)) e.status = 'Choose a status.';
  if (v.assigned_to && !(await db.get('SELECT 1 FROM users WHERE id=? AND active=1', [v.assigned_to]))) v.assigned_to = null;
  if (!e.selling_price && !e.service_fee && !e.discount && v.discount > v.selling_price + v.service_fee) e.discount = 'Discount cannot exceed the price plus fee.';
  if (v.request_id && !(await db.get('SELECT 1 FROM requests WHERE id=?', [v.request_id]))) v.request_id = null;
  return { v, e };
}

export const BK_BADGE: Record<string, string> = { Quoted: 'b-warn', Confirmed: 'b-info', Completed: 'b-ok', Cancelled: 'b-err' };
export const PAY_BADGE: Record<string, string> = { Paid: 'b-ok', Overpaid: 'b-warn', Unpaid: 'b-err' };
export const reqBadge = (s: string) => (s === 'Pending Review' ? 'b-warn' : ['Completed', 'Booked / Confirmed'].includes(s) ? 'b-ok' : ['Cancelled', 'Rejected'].includes(s) ? 'b-err' : 'b-info');
