import { api, csv } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { hrs, isDate, today } from '@/lib/util';
import { dayRows } from '@/lib/queries/owner';

export const GET = api(async (req) => {
  await apiUser('owner');
  const q = req.nextUrl.searchParams.get('day') || '';
  const day = isDate(q) ? q : today();
  const hm = (s?: string | null) => (s ? s.slice(11, 16) : '');
  const rows = await dayRows(day);
  return csv('attendance-' + day, ['Emp No', 'Employee', 'Designation', 'Date', 'Status', 'Time in', 'Time out', 'Late (min)', 'Hours'],
    rows.map(({ u, d }) => [u.emp_no, u.name, u.designation, day, d.status, hm(d.rec?.time_in), hm(d.rec?.time_out), d.late_min, hrs(d.mins)]));
});
