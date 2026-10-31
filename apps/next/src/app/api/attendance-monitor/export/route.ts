import { api, csv } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { flat } from '@/lib/list';
import { hm12, hrs, intOrNull } from '@/lib/util';
import { ATT_STATUSES } from '@/lib/types';
import { attendanceRecords, recordRange } from '@/lib/queries/payroll';

/** The filtered attendance records (same filters as the Attendance tab). */
export const GET = api(async (req) => {
  await apiUser('owner');
  const q = flat(Object.fromEntries(req.nextUrl.searchParams));
  const r = recordRange(q);
  const rows = await attendanceRecords({ ...r, uid: intOrNull(q.uid), statuses: (q.status || '').split(',').filter((s) => ATT_STATUSES.includes(s)) });
  const hm = (s?: string | null) => hm12(s);
  return csv(`attendance-${r.from}-to-${r.to}`, ['Employee', 'Designation', 'Date', 'Status', 'Time in', 'Break out', 'Break in', 'Time out', 'Late (min)', 'Hours', 'Issue'],
    rows.map((x) => [x.name, x.designation, x.day, x.status, hm(x.time_in), hm(x.break_out), hm(x.break_in), hm(x.time_out), x.late_min || '', x.mins ? hrs(x.mins) : '', x.issue || '']));
});
