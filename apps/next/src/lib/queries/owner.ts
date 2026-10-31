// Owner-area queries: period filter, dashboard/chart data, attendance monitor + report data. Server-only.
import 'server-only';
import { db } from '../db';
import * as B from '../biz';
import * as U from '../util';
import type { Row } from '../types';
import { activeEmployees } from './payroll';

export const PERIODS: [string, string][] = [['day', 'Day'], ['month', 'This month'], ['quarter', 'This quarter'], ['year', 'This year'], ['custom', 'Custom range']];

/**
 * Resolve a period selection (day/month/quarter/year/custom) to { from, to, key }. Without `period`, explicit
 * `from`/`to` dates (from the header date menu, whose preset name is in `range`) are used as a custom range.
 */
export function period(q: Record<string, string | undefined>) {
  const t = U.today();
  let from: string, to: string, key = U.isDate(q.from) && U.isDate(q.to) && (q.range || !q.period) ? 'custom' : q.period || '';
  switch (key) {
    case 'day': from = to = U.isDate(q.from) ? q.from : t; break;
    case 'quarter': {
      const m = Number(t.slice(5, 7)), s = Math.floor((m - 1) / 3) * 3 + 1;
      from = `${t.slice(0, 4)}-${String(s).padStart(2, '0')}-01`;
      to = U.monthRange(`${t.slice(0, 4)}-${String(s + 2).padStart(2, '0')}`)[1]; break;
    }
    case 'year': from = `${t.slice(0, 4)}-01-01`; to = `${t.slice(0, 4)}-12-31`; break;
    case 'custom': from = U.isDate(q.from) ? q.from : t.slice(0, 7) + '-01'; to = U.isDate(q.to) ? q.to : t; break;
    default: [from, to] = U.monthRange(t.slice(0, 7)); key = 'month';
  }
  if (to < from) [from, to] = [to, from];
  if (U.diffMin(from + ' 00:00:00', to + ' 00:00:00') > 366 * 1440) from = U.addDays(to, -366);
  return { from, to, key };
}

/** People counted in attendance: active employees (Attendance Monitoring → Employees); never the owner or admins. */
export const activeStaff = activeEmployees;

export async function counts() {
  return (await db.get(`SELECT
    (SELECT COUNT(*) FROM requests WHERE status='Pending Review') AS pending,
    (SELECT COUNT(*) FROM requests WHERE status NOT IN ('Completed','Cancelled','Rejected')) AS open_requests,
    (SELECT COUNT(*) FROM bookings WHERE status='Confirmed') AS confirmed,
    (SELECT COUNT(*) FROM bookings WHERE status='Completed') AS completed,
    (SELECT COUNT(*) FROM customers) AS customers,
    (SELECT COUNT(*) FROM messages WHERE handled=0) AS messages`))!;
}

export async function staffDashboard(me: Row) {
  const [mine, newest] = await Promise.all([
    db.all(`SELECT r.id,r.ref,r.status,r.service_type,c.name AS customer FROM requests r JOIN customers c ON c.id=r.customer_id
      WHERE r.assigned_to=? AND r.status NOT IN ('Completed','Cancelled','Rejected') ORDER BY r.id DESC LIMIT 8`, [me.id]),
    db.all(`SELECT r.id,r.ref,r.service_type,r.created_at,c.name AS customer FROM requests r JOIN customers c ON c.id=r.customer_id WHERE r.status='Pending Review' ORDER BY r.id DESC LIMIT 8`),
  ]);
  return { mine, newest };
}

export interface ChartData {
  months: string[]; sales: number[]; collected: number[]; expenses: number[]; net: number[];
  byService: { k: string; n: number }[]; byStatus: { k: string; n: number }[]; inquiries: number[];
  attMonthly: number[]; attMonths: string[]; perEmp: { n: string; late: number; absent: number }[];
}

export async function ownerDashboard(from: string, to: string) {
  const today = U.today();
  const f = await B.finance(from, to);
  const newInq = (await db.val('SELECT COUNT(*) FROM requests WHERE SUBSTR(created_at,1,10) BETWEEN ? AND ?', [from, to])) ?? 0;
  const staff = await activeStaff();
  const ids = new Set(staff.map((u) => u.id));
  const todayRecs = (await db.all('SELECT * FROM attendance WHERE day=?', [today])).filter((r) => ids.has(r.user_id));
  const todayRows = await Promise.all(staff.map(async (u) => (await B.daily(u, today, today))[0]));
  const emp = {
    active: staff.length, timedIn: todayRecs.length, clockedIn: todayRecs.filter((r) => r.time_in && !r.time_out).length,
    late: todayRecs.filter((r) => r.is_late).length, absent: todayRows.filter((r) => r && r.status === 'Absent').length,
    incomplete: (await db.val(`SELECT COUNT(*) FROM attendance WHERE time_out IS NULL AND day<? AND day BETWEEN ? AND ?`, [today, from, to])) ?? 0,
  };
  const months = U.monthsBack(to, 12);
  const series = await Promise.all(months.map(async (m) => { const [a, z] = U.monthRange(m); const x = await B.finance(a, z); return { sales: x.booking_sales, collected: x.collected, expenses: x.expenses, net: x.net }; }));
  const byService = await db.all<{ k: string; n: number }>(`SELECT service_type AS k, COUNT(*) AS n FROM bookings WHERE status!='Cancelled' AND SUBSTR(created_at,1,10) BETWEEN ? AND ? GROUP BY 1`, [from, to]);
  const byStatus = await db.all<{ k: string; n: number }>(`SELECT status AS k, COUNT(*) AS n FROM bookings WHERE SUBSTR(created_at,1,10) BETWEEN ? AND ? GROUP BY 1`, [from, to]);
  const inquiries = await Promise.all(months.map(async (m) => (await db.val(`SELECT COUNT(*) FROM requests WHERE SUBSTR(created_at,1,7)=?`, [m])) ?? 0));
  const attMonths = months.slice(-6);
  const attMonthly = await Promise.all(attMonths.map(async (m) => (await db.val(`SELECT COUNT(*) FROM attendance WHERE SUBSTR(day,1,7)=?`, [m])) ?? 0));
  const perEmp = await Promise.all(staff.map(async (u) => { const s = B.summarize(u, await B.daily(u, from, to)); return { n: u.name as string, late: s.late, absent: s.absent }; }));
  const chart: ChartData = {
    months, sales: series.map((s) => s.sales / 100), collected: series.map((s) => s.collected / 100), expenses: series.map((s) => s.expenses / 100),
    net: series.map((s) => s.net / 100), byService, byStatus, inquiries, attMonthly, attMonths, perEmp,
  };
  return { f, newInq, emp, chart };
}

/** Per-employee status rows for one day (attendance monitor + CSV). */
export async function dayRows(day: string) {
  return Promise.all((await activeStaff()).map(async (u) => ({ u, d: ((await B.daily(u, day, day))[0] || { status: 'Future', rec: null, mins: 0, late_min: 0 }) as Row })));
}

/** Attendance-report data for a month (+ optional employee). */
export async function attendanceReport(ym: string, uid: number | null) {
  const all = await db.all('SELECT * FROM users WHERE active=1 OR id IN (SELECT user_id FROM attendance) ORDER BY name');
  const users = uid ? all.filter((u) => u.id === uid) : all;
  const [from, to] = U.monthRange(ym);
  const detail = await Promise.all(users.map(async (u) => ({ u, rows: await B.daily(u, from, to) })));
  const sums = detail.map((d) => B.summarize(d.u, d.rows));
  const prev = U.monthsBack(ym + '-01', 4).slice(0, 3);
  const compare = await Promise.all(users.map(async (u) => ({
    u, months: await Promise.all(prev.map(async (m) => { const [a, z] = U.monthRange(m); const s = B.summarize(u, await B.daily(u, a, z)); return { m, pct: s.pct, late: s.late, absent: s.absent, hrs: s.mins }; })),
  })));
  const corr = await db.all(`SELECT c.*, u.name AS who, b.name AS by_name FROM attendance_corrections c JOIN users u ON u.id=c.user_id JOIN users b ON b.id=c.by_user
    WHERE SUBSTR(c.day,1,7)=? ${uid ? 'AND c.user_id=?' : ''} ORDER BY c.id DESC`, uid ? [ym, uid] : [ym]);
  return { all, detail, sums, prev, compare, corr };
}

/** Shared by the audit page and CSV export. */
export function auditFilter(q: Record<string, string>) {
  const w: string[] = [], p: unknown[] = [];
  if (q.q) { const l = `%${U.str(q.q, 60)}%`; w.push('(action LIKE ? OR detail LIKE ? OR username LIKE ? OR entity_id LIKE ?)'); p.push(l, l, l, l); }
  if (q.entity) { w.push('entity=?'); p.push(U.str(q.entity, 30)); }
  if (q.action) { w.push('action=?'); p.push(U.str(q.action, 60)); }
  if (U.isDate(q.from)) { w.push('SUBSTR(at,1,10)>=?'); p.push(q.from); }
  if (U.isDate(q.to)) { w.push('SUBSTR(at,1,10)<=?'); p.push(q.to); }
  return { sql: `SELECT * FROM audit_logs ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY id DESC`, p };
}

/** Finance extras (by service, expenses by category, outstanding list). */
export async function financeDetail(from: string, to: string) {
  const byService = await db.all(`SELECT service_type AS k, COUNT(*) AS n, SUM(selling_price+service_fee-discount) AS sales, SUM(supplier_cost) AS cost, SUM(service_fee) AS fees
    FROM bookings WHERE status IN ('Confirmed','Completed') AND SUBSTR(created_at,1,10) BETWEEN ? AND ? GROUP BY 1 ORDER BY sales DESC`, [from, to]);
  const expCat = await db.all(`SELECT category AS k, SUM(amount) AS total FROM expenses WHERE status='Valid' AND spent_at BETWEEN ? AND ? GROUP BY 1 ORDER BY total DESC`, [from, to]);
  const owing = (await db.all(`SELECT * FROM (${B.bookingSelect}) x WHERE status IN ('Confirmed','Completed')`)).map(B.decorate).filter((b) => b.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 15);
  return { byService, expCat, owing };
}

export const CONTENT_KEYS = ['business_name', 'tagline', 'location', 'phone', 'mobile', 'email', 'address', 'map_url', 'hours', 'facebook', 'facebook_name', 'instagram', 'about', 'mission', 'vision', 'values', 'fares_title', 'fares_note', 'fares', 'partners', 'why', 'privacy'];
export const LONG_KEYS = ['privacy', 'about', 'fares', 'why', 'fares_note', 'partners', 'mission', 'vision'];
export const SYSTEM_KEYS = ['retention_years'];

/** Today's attendance counts for the owner dashboard (active employees only). */
export async function attendanceToday() {
  const today = U.today();
  const staff = await activeStaff();
  const ids = new Set(staff.map((u) => u.id));
  const todayRecs = (await db.all('SELECT * FROM attendance WHERE day=?', [today])).filter((r) => ids.has(r.user_id));
  const todayRows = await Promise.all(staff.map(async (u) => (await B.daily(u, today, today))[0]));
  return {
    active: staff.length, timedIn: todayRecs.length, clockedIn: todayRecs.filter((r) => r.time_in && !r.time_out).length,
    late: todayRecs.filter((r) => r.is_late).length, absent: todayRows.filter((r) => r && r.status === 'Absent').length,
    // Records that were never finished (no time-out, e.g. a skipped break or a forgotten time-out) on earlier days - last 30 days.
    incomplete: (await db.val(`SELECT COUNT(*) FROM attendance WHERE time_out IS NULL AND day<? AND day>=?`, [today, U.addDays(today, -30)])) ?? 0,
  };
}
