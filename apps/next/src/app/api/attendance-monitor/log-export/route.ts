import { api, csv } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { flat } from '@/lib/list';
import { attendanceLogQuery } from '@/lib/queries/attendance-log';

/** Staff attendance log as CSV, in the client's sheet columns. */
export const GET = api(async (req) => {
  await apiUser('owner');
  const [sql, p, range] = attendanceLogQuery(flat(Object.fromEntries(req.nextUrl.searchParams)));
  const hm = (s?: string | null) => (s ? s.slice(11, 16) : '');
  const rows = await db.all(sql, p);
  return csv(`staff-attendance-${range.from}-to-${range.to}`, ['Name', 'Date', 'Time In', 'Time Out', 'Designation'],
    rows.map((r) => [r.name, r.day, hm(r.time_in), hm(r.time_out), r.designation]));
});
