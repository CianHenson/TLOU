import { api, ok, fail, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { PAY_PERIODS } from '@/lib/types';
import { addDays, isDate, now, peso, str, today, toCents } from '@/lib/util';
import { basicPay, payPeriod, workSummary } from '@/lib/queries/payroll';

/**
 * Owner / admin: generate a payroll record for one active employee and period from their attendance. Working days and
 * hours count only complete time-in/out days (incomplete days are reported, not paid); basic pay = hours × the current
 * hourly rate. The result is saved as a snapshot that payslips print from. Overlapping periods for the same employee are
 * refused (delete the old record to regenerate).
 */
export const POST = api(async (req) => {
  const user = await apiUser('owner');
  const { b } = await form(req);
  const empId = /^\d+$/.test(String(b.employee_id ?? '')) ? Number(b.employee_id) : 0;
  const kind = PAY_PERIODS.includes(String(b.period_kind)) ? String(b.period_kind) : '';
  const start = str(b.period_from, 10), end = str(b.period_to, 10);
  const adjRaw = str(b.adjustments, 20), adj = adjRaw ? toCents(adjRaw) : 0, note = str(b.adjustment_note, 200);
  const errors: Record<string, string> = {};
  const emp = empId ? await db.get(`SELECT e.*, u.id AS uid, u.name, u.active AS user_active, u.sched_start, u.sched_end, u.grace_min, u.break_min, u.workdays, u.created_at
    FROM employees e JOIN users u ON u.id=e.user_id WHERE e.id=?`, [empId]) : undefined;
  if (!emp) errors.employee_id = 'Choose an employee.';
  else if (!emp.active || !emp.user_active) errors.employee_id = 'This employee is deactivated.';
  else if (emp.hourly_rate <= 0) errors.employee_id = `Set ${emp.name}'s hourly rate first (Employees tab).`;
  if (!kind) errors.period_kind = 'Choose a period.';
  if (!isDate(start)) errors.period_from = 'Choose the start date.';
  if (kind === 'Custom' && !isDate(end)) errors.period_to = 'Choose the end date.';
  if (!Number.isFinite(adj)) errors.adjustments = 'Enter an amount, e.g. 500 or -250.';
  else if (adj && !note) errors.adjustment_note = 'Say what the adjustment is for.';
  if (Object.keys(errors).length) return invalid(errors);
  const [from, to] = payPeriod(kind, start, end);
  if (to < from) return invalid({ period_to: 'Must be on or after the start date.' });
  if (to > addDays(from, 62)) return invalid({ period_to: 'A payroll period can be at most 63 days.' });
  if (to > today()) return fail(`This period ends ${to}; payroll can only be generated once the period is over.`);
  const clash = await db.get('SELECT period_from, period_to FROM payroll WHERE employee_id=? AND period_from<=? AND period_to>=?', [emp!.id, to, from]);
  if (clash) return fail(`${emp!.name} already has payroll for ${clash.period_from} to ${clash.period_to}. Delete it first to regenerate.`);

  const s = await workSummary({ ...emp!, id: emp!.uid }, from, to);
  const basic = basicPay(s.minutes, emp!.hourly_rate), net = basic + adj;
  if (net < 0) return invalid({ adjustments: 'Deductions cannot be more than the basic pay.' });
  const { id } = await db.run(`INSERT INTO payroll (employee_id,user_id,period_kind,period_from,period_to,days,minutes,incomplete,hourly_rate,basic_pay,adjustments,adjustment_note,net_pay,created_by,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`, [emp!.id, emp!.uid, kind, from, to, s.days, s.minutes, s.incomplete, emp!.hourly_rate, basic, adj, note || null, net, user.id, now()]);
  await audit({ user, ip: clientIp(req) }, 'payroll.generate', 'payroll', id, { employee: emp!.uid, from, to, days: s.days, minutes: s.minutes, rate: emp!.hourly_rate, net });
  return ok(`Payroll generated for ${emp!.name}: ${peso(net)}${s.incomplete ? ` (${s.incomplete} incomplete day${s.incomplete === 1 ? '' : 's'} not paid)` : ''}.`, { id });
});
