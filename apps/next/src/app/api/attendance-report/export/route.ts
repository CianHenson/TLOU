import { api, csv } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { hm12, hrs, today } from '@/lib/util';
import { attendanceReport } from '@/lib/queries/owner';

export const GET = api(async (req) => {
  await apiUser('owner');
  const sp = req.nextUrl.searchParams;
  const ym = /^\d{4}-\d{2}$/.test(sp.get('month') || '') ? sp.get('month')! : today().slice(0, 7);
  const uid = /^\d+$/.test(sp.get('employee') || '') ? Number(sp.get('employee')) : null;
  const { detail, sums } = await attendanceReport(ym, uid);
  const hm = (s?: string | null) => hm12(s);
  if (sp.get('detail')) {
    return csv(`attendance-detail-${ym}`, ['Emp No', 'Employee', 'Date', 'Status', 'Time in', 'Time out', 'Late (min)', 'Hours'],
      detail.flatMap((d) => d.rows.map((r) => [d.u.emp_no, d.u.name, r.day, r.status, hm(r.rec?.time_in), hm(r.rec?.time_out), r.late_min, hrs(r.mins)])));
  }
  return csv(`attendance-summary-${ym}`, ['Emp No', 'Employee', 'Month', 'Scheduled days', 'Days attended', 'Absences', 'Approved leave', 'Late arrivals', 'Incomplete', 'Total hours', 'Avg hours/day', 'Attendance %'],
    sums.map((s) => [s.user.emp_no, s.user.name, ym, s.scheduled, s.days, s.absent, s.leave, s.late, s.incomplete, hrs(s.mins), hrs(s.avg), s.pct]));
});
