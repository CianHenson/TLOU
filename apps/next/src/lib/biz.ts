// Business rules: settings, audit, booking money, finance totals, attendance calculations. Server-only.
import 'server-only';
import { cache } from 'react';
import { db } from './db';
import * as U from './util';
import type { Row } from './types';
import type { SessionUser } from './auth';

export * from './types'; // STATUSES, SERVICE_TYPES, METHODS, ... are re-exported for convenience

// ---------- settings ----------
export interface Settings extends Record<string, any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  business_name: string; tagline: string; phones: string;
  fareList: { route: string; from: string; to: string; cents: number }[];
  whyList: { t: string; d: string }[];
  partnerList: string[];
}
export const settings = cache(async (): Promise<Settings> => {
  const s: Row = Object.fromEntries((await db.all('SELECT k,v FROM settings WHERE k NOT LIKE \'\\_%\'')).map((r) => [r.k, r.v ?? '']));
  s.phones = [s.phone, s.mobile].filter(Boolean).join(' · ');
  const lines = (t: string) => String(t || '').split('\n').map((l) => l.trim()).filter(Boolean);
  s.fareList = lines(s.fares).map((l) => {
    const [route, amt] = l.split('|').map((x) => x.trim());
    const [from, to] = route.split(/\s+to\s+/i);
    return { route, from: from || '', to: to || '', cents: U.toCents(amt) };
  }).filter((f) => Number.isFinite(f.cents));
  s.whyList = lines(s.why).map((l) => { const [t, d] = l.split('|'); return { t: (t || '').trim(), d: (d || '').trim() }; });
  s.partnerList = String(s.partners || '').split(',').map((x) => x.trim()).filter(Boolean);
  return s as Settings;
});

// ---------- audit ----------
export async function audit(who: { user?: Pick<SessionUser, 'id' | 'username'> | null; ip?: string | null } | null, action: string, entity: string | null, entityId: unknown, detail?: unknown) {
  const u = who?.user;
  await db.run('INSERT INTO audit_logs (at,user_id,username,action,entity,entity_id,detail,ip) VALUES (?,?,?,?,?,?,?,?)',
    [U.now(), u ? u.id : null, u ? u.username : null, action, entity, entityId == null ? null : String(entityId),
      typeof detail === 'string' ? detail : JSON.stringify(detail ?? {}), who?.ip ?? null]);
}

// ---------- bookings / payments ----------
export const total = (b: { selling_price: number; service_fee: number; discount: number }) => b.selling_price + b.service_fee - b.discount; // total payable
export const payStatus = (tot: number, paid: number) => (paid <= 0 ? 'Unpaid' : paid < tot ? 'Partially Paid' : paid === tot ? 'Paid' : 'Overpaid');

/** Valid payments minus valid refunds, per booking `b` (use inside a query that aliases bookings as b). */
export const PAID_SQL = `COALESCE((SELECT SUM(CASE p.kind WHEN 'Payment' THEN p.amount ELSE -p.amount END)
  FROM payments p WHERE p.booking_id=b.id AND p.status='Valid'),0)`;

export function decorate(b: Row): Row {
  b.total = total(b as never);
  b.balance = b.status === 'Cancelled' ? 0 : Math.max(0, b.total - b.paid);
  b.pay_status = payStatus(b.total, b.paid);
  b.margin = b.total - b.supplier_cost;
  return b;
}
export const bookingSelect = `SELECT b.*, c.name AS customer, c.code AS customer_code, u.name AS employee, ${PAID_SQL} AS paid
  FROM bookings b JOIN customers c ON c.id=b.customer_id LEFT JOIN users u ON u.id=b.assigned_to`;

// ---------- finance ----------
// Accounting assumptions (shown on the Financial Reports page):
//  * Sales (quoted+confirmed+completed) are by booking date; Cancelled bookings are excluded everywhere.
//  * Confirmed value = Confirmed + Completed bookings. Supplier cost and margin are recognised on confirmed value only.
//  * Collections = valid payments less valid refunds, by payment date (cash basis). Reversed payments are ignored.
//  * Gross booking margin = confirmed value - supplier cost. Net operating result = gross margin - valid expenses.
//  * Outstanding balance = sum of (total payable - net paid) on Confirmed/Completed bookings, regardless of date range.
export async function finance(from: string, to: string) {
  const d = (col: string) => `SUBSTR(${col},1,10) BETWEEN ? AND ?`;
  const rng = [from, to];
  const sales = (await db.get(`SELECT
      COALESCE(SUM(CASE WHEN status!='Cancelled' THEN selling_price+service_fee-discount END),0) AS booking_sales,
      COALESCE(SUM(CASE WHEN status='Quoted' THEN selling_price+service_fee-discount END),0) AS quoted,
      COALESCE(SUM(CASE WHEN status IN ('Confirmed','Completed') THEN selling_price+service_fee-discount END),0) AS confirmed,
      COALESCE(SUM(CASE WHEN status='Completed' THEN selling_price+service_fee-discount END),0) AS completed,
      COALESCE(SUM(CASE WHEN status='Cancelled' THEN selling_price+service_fee-discount END),0) AS cancelled,
      COALESCE(SUM(CASE WHEN status IN ('Confirmed','Completed') THEN supplier_cost END),0) AS supplier_costs,
      COALESCE(SUM(CASE WHEN status IN ('Confirmed','Completed') THEN service_fee END),0) AS fees,
      COALESCE(SUM(CASE WHEN status IN ('Confirmed','Completed') THEN discount END),0) AS discounts,
      COUNT(CASE WHEN status='Confirmed' THEN 1 END) AS n_confirmed, COUNT(CASE WHEN status='Completed' THEN 1 END) AS n_completed
    FROM bookings WHERE ${d('created_at')}`, rng))!;
  const pay = (await db.get(`SELECT
      COALESCE(SUM(CASE WHEN kind='Payment' THEN amount END),0) AS received,
      COALESCE(SUM(CASE WHEN kind='Refund' THEN amount END),0) AS refunds
    FROM payments WHERE status='Valid' AND ${d('paid_at')}`, rng))!;
  const expenses = (await db.val(`SELECT COALESCE(SUM(amount),0) FROM expenses WHERE status='Valid' AND ${d('spent_at')}`, rng)) ?? 0;
  const outstanding = (await db.val(`SELECT COALESCE(SUM(GREATEST(0, (b.selling_price+b.service_fee-b.discount) - ${PAID_SQL})),0)
    FROM bookings b WHERE b.status IN ('Confirmed','Completed')`)) ?? 0;
  const collected = pay.received - pay.refunds;
  const grossMargin = sales.confirmed - sales.supplier_costs;
  return { ...sales, collected, received: pay.received as number, refunds: pay.refunds as number, expenses, outstanding, grossMargin, net: grossMargin - expenses } as Row & {
    booking_sales: number; quoted: number; confirmed: number; completed: number; cancelled: number; supplier_costs: number; fees: number; discounts: number;
    n_confirmed: number; n_completed: number; collected: number; received: number; refunds: number; expenses: number; outstanding: number; grossMargin: number; net: number;
  };
}

// ---------- attendance ----------
export function schedFor(u: Row) {
  return { start: u.sched_start as string, end: u.sched_end as string, grace: u.grace_min as number, brk: u.break_min as number, days: String(u.workdays).split(',').filter(Boolean).map(Number) };
}

/** Late = time-in later than scheduled start + grace period. */
export function lateInfo(u: Row, timeIn: string) {
  const s = schedFor(u);
  const over = U.tmins(timeIn) - U.mins(s.start);
  return over > s.grace ? { is_late: 1, late_min: over } : { is_late: 0, late_min: 0 };
}

/** Worked minutes; unpaid break is deducted only when the shift spans longer than the break + 1h. */
export function workedMin(u: Row, r: Row | null | undefined) {
  if (!r || !r.time_in || !r.time_out) return 0;
  const span = U.diffMin(r.time_in, r.time_out);
  if (span <= 0) return 0;
  return Math.max(0, span - (span > u.break_min + 60 ? u.break_min : 0));
}

export interface DayRow { day: string; rec: Row | null; scheduled: boolean; mins: number; status: string; late: boolean; late_min: number }

/** Per-day attendance status list for one employee between two dates (inclusive), up to today. */
export async function daily(u: Row, from: string, to: string): Promise<DayRow[]> {
  const nowStr = U.now(), today = nowStr.slice(0, 10), s = schedFor(u);
  const recs = Object.fromEntries((await db.all('SELECT * FROM attendance WHERE user_id=? AND day BETWEEN ? AND ?', [u.id, from, to])).map((r) => [r.day, r]));
  const lv = await db.all('SELECT * FROM leaves WHERE (user_id=? OR user_id IS NULL) AND day BETWEEN ? AND ?', [u.id, from, to]);
  const hol = new Set(lv.filter((l) => l.kind === 'Holiday').map((l) => l.day));
  const leave = new Set(lv.filter((l) => l.kind === 'Leave').map((l) => l.day));
  const startDay = String(u.created_at).slice(0, 10);
  const out: DayRow[] = [];
  for (let d = from; d <= to; d = U.addDays(d, 1)) {
    if (d > today) break;
    const r = recs[d];
    const row: DayRow = { day: d, rec: r || null, scheduled: s.days.includes(U.dow(d)), mins: workedMin(u, r), status: '', late: !!(r && r.is_late), late_min: r ? r.late_min : 0 };
    if (r && r.time_in) {
      row.status = !r.time_out && (d < today || nowStr.slice(11, 16) > s.end) ? 'Incomplete' : !r.time_out ? 'Clocked in' : r.is_late ? 'Late' : 'Present';
    } else if (hol.has(d)) row.status = 'Holiday';
    else if (leave.has(d)) row.status = 'Approved leave';
    else if (!row.scheduled) row.status = 'Rest day';
    else if (d < startDay) row.status = 'Not employed';
    else if (d < today || nowStr.slice(11, 16) > s.end) row.status = 'Absent'; // cutoff = scheduled end of shift
    else row.status = 'Pending';
    out.push(row);
  }
  return out;
}

export function summarize(u: Row, rows: DayRow[]) {
  const att = rows.filter((r) => r.rec && r.rec.time_in);
  const sched = rows.filter((r) => r.scheduled && !['Holiday', 'Approved leave', 'Not employed'].includes(r.status) && r.status !== 'Pending');
  const mins = rows.reduce((a, r) => a + r.mins, 0);
  const days = att.length, absent = rows.filter((r) => r.status === 'Absent').length;
  const expected = sched.length;
  return {
    user: u, scheduled: expected, days, absent, leave: rows.filter((r) => r.status === 'Approved leave').length,
    holidays: rows.filter((r) => r.status === 'Holiday').length, late: att.filter((r) => r.rec!.is_late).length,
    incomplete: rows.filter((r) => r.status === 'Incomplete').length, mins,
    avg: days ? mins / days : 0,
    pct: expected ? Math.min(100, Math.round((rows.filter((r) => r.scheduled && r.rec && r.rec.time_in).length / expected) * 1000) / 10) : 0,
  };
}
