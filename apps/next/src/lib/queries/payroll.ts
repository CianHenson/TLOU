// Attendance & payroll: employees (registered Staff users assigned for attendance/payroll), day-off requests, attendance
// records and generated payroll. Owners and admins are never employees. Server-only.
import 'server-only';
import { db } from '../db';
import * as B from '../biz';
import * as U from '../util';
import { ATT_STATUSES } from '../types';
import type { Row } from '../types';

/** User columns needed for attendance calculations (never password_hash). */
const UCOLS = 'u.id, u.emp_no, u.name, u.email, u.designation, u.active AS user_active, u.sched_start, u.sched_end, u.grace_min, u.break_min, u.workdays, u.created_at';

/** Every employee (active and deactivated) with their user details; `id` is the user id, `employee_id` the employees row. */
export const allEmployees = () => db.all(`SELECT ${UCOLS}, e.id AS employee_id, e.hourly_rate, e.active FROM employees e JOIN users u ON u.id=e.user_id
  ORDER BY e.active DESC, u.name`);

/** Employees counted in attendance and payroll right now: active employee record and an active user account. */
export const activeEmployees = () => db.all(`SELECT ${UCOLS}, e.id AS employee_id, e.hourly_rate, e.active FROM employees e JOIN users u ON u.id=e.user_id
  WHERE e.active=1 AND u.active=1 ORDER BY u.name`);

/** Registered Staff accounts that can still be added as employees (owner / admins never appear). */
export const availableUsers = () => db.all(`SELECT id, name, email, designation FROM users
  WHERE role='employee' AND active=1 AND id NOT IN (SELECT user_id FROM employees) ORDER BY name`);

/** The active employee record for a user, if any. */
export const employeeOf = (userId: number) => db.get(`SELECT e.* FROM employees e JOIN users u ON u.id=e.user_id WHERE e.user_id=? AND e.active=1 AND u.active=1`, [userId]);

/** Working days (days with a complete time-in/out), payable minutes and incomplete days for one employee in a period. */
export async function workSummary(u: Row, from: string, to: string) {
  const rows = await B.daily(u, from, to);
  const worked = rows.filter((r) => r.mins > 0);
  return { days: worked.length, minutes: worked.reduce((a, r) => a + r.mins, 0), incomplete: rows.filter((r) => r.status === 'Incomplete').length };
}

/** Basic pay in centavos: payable minutes × hourly rate (centavos per hour), rounded to the centavo. */
export const basicPay = (minutes: number, rate: number) => Math.round((minutes * rate) / 60);

/** End date and normalised start for a payroll period kind. */
export function payPeriod(kind: string, from: string, to: string): [string, string] {
  if (kind === 'Weekly') return [from, U.addDays(from, 6)];
  if (kind === 'Biweekly') return [from, U.addDays(from, 13)];
  if (kind === 'Monthly') return U.monthRange(from.slice(0, 7));
  return [from, to];
}

/**
 * Daily attendance records for the monitor: one row per employee per day in the range (newest first), with the status
 * from biz.daily. Rest days, days before the account existed and today's not-yet-due days are left out; deactivated
 * employees only show days they actually attended. `statuses` limits to those statuses.
 */
export async function attendanceRecords(f: { from: string; to: string; uid: number | null; statuses: string[] }) {
  const emps = (await allEmployees()).filter((e) => !f.uid || e.id === f.uid);
  const keep = new Set(f.statuses.length ? f.statuses : ATT_STATUSES);
  const out: Row[] = [];
  for (const e of emps) {
    for (const d of await B.daily(e, f.from, f.to)) {
      if (!keep.has(d.status) || (!(e.active && e.user_active) && !d.rec)) continue;
      out.push({ uid: e.id, name: e.name, designation: e.designation, day: d.day, status: d.status, time_in: d.rec?.time_in ?? null, break_out: d.rec?.break_out ?? null, break_in: d.rec?.break_in ?? null,
        time_out: d.rec?.time_out ?? null, late_min: d.late ? d.late_min : 0, mins: d.mins, issue: d.issue });
    }
  }
  return out.sort((a, b) => (a.day === b.day ? String(a.name).localeCompare(b.name) : a.day < b.day ? 1 : -1));
}

/** Range for the attendance filters: `from`/`to` (default today), at most 93 days. */
export function recordRange(q: Record<string, string>) {
  const td = U.today();
  let to = U.isDate(q.to) ? q.to : td, from = U.isDate(q.from) ? q.from : to;
  if (to > td) to = td;
  if (from > to) from = to;
  if (U.diffMin(from + ' 00:00:00', to + ' 00:00:00') > 92 * 1440) from = U.addDays(to, -92);
  return { from, to, range: q.range || (U.isDate(q.from) || U.isDate(q.to) ? 'custom' : 'today') };
}

/** Day-off requests with the employee's name (newest first): every pending one plus the last 120 days of reviewed ones. */
export const leaveRequests = () => db.all(`SELECT r.*, u.name, b.name AS reviewer FROM leave_requests r JOIN users u ON u.id=r.user_id LEFT JOIN users b ON b.id=r.reviewed_by
  WHERE r.status='Pending' OR r.created_at>=? ORDER BY r.status='Pending' DESC, r.created_at DESC`, [U.addDays(U.today(), -120) + ' 00:00:00']);

/** Generated payroll records (newest period first), optionally for one user and/or periods starting in a range. */
export function payrollList(f: { uid: number | null; from: string; to: string }) {
  const w: string[] = [], p: unknown[] = [];
  if (f.uid) { w.push('p.user_id=?'); p.push(f.uid); }
  if (f.from) { w.push('p.period_to>=?'); p.push(f.from); }
  if (f.to) { w.push('p.period_from<=?'); p.push(f.to); }
  return db.all(`SELECT p.*, u.name, u.designation, c.name AS created_by_name FROM payroll p JOIN users u ON u.id=p.user_id LEFT JOIN users c ON c.id=p.created_by
    ${w.length ? 'WHERE ' + w.join(' AND ') : ''} ORDER BY p.period_from DESC, u.name`, p);
}
