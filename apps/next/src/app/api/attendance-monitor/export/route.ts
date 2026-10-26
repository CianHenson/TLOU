import { api, csv } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { flat } from '@/lib/list';
import { hrs, intOrNull } from '@/lib/util';
import { ATT_STATUSES } from '@/lib/types';
import { attendanceRecords, recordRange } from '@/lib/queries/payroll';

/** The filtered attendance records (same filters as the Attendance tab). */
export const GET = api(async (req) => {
  await apiUser('owner');
  const q = flat(Object.fromEntries(req.nextUrl.searchParams));
  const r = recordRange(q);
  const rows = await attendanceRecords({ ...r, uid: intOrNull(q.uid), statuses: (q.status || '').split(',').filter((s) => ATT_STATUSES.includes(s)) });
  const hm = (s?: string | null) => (s ? s.slice(11, 16) : '');
  return csv(`attendance-${r.from}-to-${r.to}`, ['Employee', 'Designation', 'Date', 'Status', 'Time in', 'Time out', 'Late (min)', 'Hours'],
    rows.map((x) => [x.name, x.designation, x.day, x.status, hm(x.time_in), hm(x.time_out), x.late_min || '', x.mins ? hrs(x.mins) : '']));
});
