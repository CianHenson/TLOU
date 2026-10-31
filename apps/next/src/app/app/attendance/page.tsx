import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import * as B from '@/lib/biz';
import * as U from '@/lib/util';
import { flat } from '@/lib/list';
import { Page } from '@/components/ui';
import { ViewScheduleButton } from '@/components/my-schedule';
import { ATT_STATUSES, WEEKDAYS } from '@/lib/types';
import { employeeOf } from '@/lib/queries/payroll';
import { MyPayslipsButton, MyRequestsButton } from '@/components/att-my-requests';
import { MyAttendanceTable } from '@/components/my-att-table';
import { TableFilters } from '@/components/list-filters';
import { MonthPicker } from '@/components/month-picker';
import { activeDeductionsOn } from '@/lib/queries/deductions';
import { HighlightScroll } from '@/components/highlight-scroll';

export const metadata = { title: 'My Attendance' };

export default async function Attendance(props: PageProps<'/app/attendance'>) {
  const me = await requireUser();
  const q = flat(await props.searchParams);
  const u = (await db.get('SELECT * FROM users WHERE id=?', [me.id]))!;
  const today = U.today();
  // One month at a time (the month picker, or ?month= from the dashboard calendar); default is this month.
  const ym = /^\d{4}-(0[1-9]|1[0-2])$/.test(q.month ?? '') && q.month <= today.slice(0, 7) ? q.month : today.slice(0, 7);
  const [from, to] = U.monthRange(ym);
  const hl = U.isDate(q.hl) ? q.hl : ''; // day to pulse (from the dashboard calendar)
  const statuses = (q.status || '').split(',').filter((x) => ATT_STATUSES.includes(x));
  const search = U.str(q.q, 60).toLowerCase();
  const rows = (await B.daily(u, from, to)).reverse().filter((r) => (!statuses.length || statuses.includes(r.status))
    && (!search || `${r.day} ${U.longDate(r.day)} ${WEEKDAYS[U.dow(r.day)]} ${r.status}`.toLowerCase().includes(search)));
  const sched = B.schedFor(u);
  const deds = await activeDeductionsOn(today);
  // Only this user's own requests, correction requests and payslips (never anyone else's).
  const [emp, requests, corrections, payslips, off] = await Promise.all([
    employeeOf(u.id),
    db.all('SELECT * FROM leave_requests WHERE user_id=? ORDER BY created_at DESC LIMIT 30', [u.id]),
    db.all('SELECT day, status FROM attendance_correction_requests WHERE user_id=? AND day BETWEEN ? AND ? ORDER BY id', [u.id, from, to]),
    db.all('SELECT id, period_kind, period_from, period_to, days, minutes, gross_pay, basic_pay, adjustments, total_deductions, net_pay FROM payroll WHERE user_id=? AND period_to>=? AND period_from<=? ORDER BY period_from DESC LIMIT 24', [u.id, from, to]),
    db.all('SELECT day, kind, note FROM leaves WHERE (user_id=? OR user_id IS NULL) AND day BETWEEN ? AND ?', [u.id, U.addDays(today, -62), U.addDays(today, 400)]),
  ]);
  const corr = new Map(corrections.map((c) => [c.day as string, c.status as string])); // the newest request per day wins
  const hm = (s?: string | null) => (s ? s.slice(11, 16) : '');
  const table = rows.map((r) => ({
    day: r.day, wd: WEEKDAYS[U.dow(r.day)], status: r.status, late_min: r.late && r.late_min ? r.late_min : 0,
    time_in: hm(r.rec?.time_in), break_out: hm(r.rec?.break_out), break_in: hm(r.rec?.break_in), time_out: hm(r.rec?.time_out), mins: r.mins, corr: corr.get(r.day) ?? '',
    issue: r.status === 'Incomplete' || r.status === 'Clocked in' ? r.issue : '',
  }));
  return (
    <Page title="My Attendance" filters={
      <div className="af-bar"><MonthPicker value={ym} max={today.slice(0, 7)} /></div>
    } actions={<><ViewScheduleButton sched={sched} off={off.map((o) => ({ day: o.day, kind: o.kind, note: o.note }))} today={today} /><MyRequestsButton requests={requests} canRequest={!!emp} today={today} /></>}>
      {hl && <HighlightScroll />}
      <div className="tw-card">
        <TableFilters q={q.q || ''} placeholder="Search date or status" trail={<MyPayslipsButton payslips={payslips} from={from} to={to} deductions={deds} />} dropdowns={[
          { key: 'status', label: 'Status', value: statuses.join(','), options: [['', 'All statuses'], ...ATT_STATUSES], multiple: true, noun: 'statuses' },
        ]} />
        <MyAttendanceTable rows={table} hl={hl} totalMins={rows.reduce((a, r) => a + r.mins, 0)} />
      </div>
    </Page>
  );
}
