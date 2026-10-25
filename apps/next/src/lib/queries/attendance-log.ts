// Staff attendance log in the client's sheet layout (Name, Date, Time In, Time Out, Designation). Server-only.
import 'server-only';
import { where } from '../list';
import { addDays, intOrNull, isDate, today } from '../util';

/** Defaults to the last 7 days. `lfrom` / `lto` / `uid` so the log's filters don't clash with the daily view's `day`. */
export function attendanceLogQuery(q: Record<string, string>): [string, unknown[], { from: string; to: string }] {
  const to = isDate(q.lto) ? q.lto : today(), from = isDate(q.lfrom) ? q.lfrom : addDays(to, -6);
  const w = where();
  w.add('a.day BETWEEN ? AND ?', from, to);
  const uid = intOrNull(q.uid);
  if (uid) w.add('a.user_id=?', uid);
  return [`SELECT a.day, a.time_in, a.time_out, a.is_late, u.name, u.designation FROM attendance a JOIN users u ON u.id=a.user_id ${w.sql}
    ORDER BY a.day DESC, u.name`, w.p, { from, to }];
}
