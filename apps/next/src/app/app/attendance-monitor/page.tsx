import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import * as U from '@/lib/util';
import { flat } from '@/lib/list';
import { activeStaff, dayRows } from '@/lib/queries/owner';
import { Page } from '@/components/ui';
import { ApiForm, Submit } from '@/components/form';

export const metadata = { title: 'Attendance Monitoring' };

const CLS: Record<string, string> = { Present: 'b-ok', Late: 'b-warn', Absent: 'b-err', Incomplete: 'b-err', 'Clocked in': 'b-info', 'Approved leave': 'b-info' };

export default async function AttendanceMonitor(props: PageProps<'/app/attendance-monitor'>) {
  await requireUser('owner');
  const q = flat(await props.searchParams);
  const today = U.today(), day = U.isDate(q.day) ? q.day : today;
  const [rows, leaves, staff] = await Promise.all([
    dayRows(day),
    db.all(`SELECT l.*, u.name FROM leaves l LEFT JOIN users u ON u.id=l.user_id WHERE l.day>=? ORDER BY l.day LIMIT 50`, [U.addDays(today, -30)]),
    activeStaff(),
  ]);
  const hm = (s?: string | null) => (s ? s.slice(11, 16) : '');
  return (
    <Page title="Attendance Monitoring">
      <form className="filters" method="get"><div><label>Date</label><input type="date" name="day" defaultValue={day} max={today} /></div>
        <div className="btnrow"><button className="btn">Show</button><a className="btn ghost" href={`/api/attendance-monitor/export?day=${day}`}>Export CSV</a><Link className="btn ghost" href="/app/attendance-report">Monthly reports →</Link></div></form>
      <p className="muted small">Live view as of {U.now().slice(11, 16)} (Asia/Manila). Absences are only flagged after the employee&apos;s shift end.</p>
      <div className="tw"><table><thead><tr><th>Employee</th><th>Schedule</th><th>Status</th><th>Time in</th><th>Time out</th><th className="num">Late (min)</th><th className="num">Hours</th><th>Correct record</th></tr></thead><tbody>
        {rows.map(({ u, d }) => (
          <tr key={u.id}><td>{u.name}<div className="small muted">{u.emp_no}</div></td><td className="nowrap">{u.sched_start}–{u.sched_end} (+{u.grace_min})</td><td><span className={`badge ${CLS[d.status] || ''}`}>{d.status}</span></td>
            <td>{hm(d.rec?.time_in) || '—'}</td><td>{hm(d.rec?.time_out) || '—'}</td><td className="num">{d.late_min || ''}</td><td className="num">{d.mins ? U.hrs(d.mins) : ''}</td>
            <td><ApiForm action="/api/attendance/correct" className="row">
              <input type="hidden" name="user_id" value={u.id} /><input type="hidden" name="day" value={day} />
              <input type="time" name="time_in" defaultValue={hm(d.rec?.time_in)} required style={{ width: 105 }} /><input type="time" name="time_out" defaultValue={hm(d.rec?.time_out)} style={{ width: 105 }} />
              <input name="reason" placeholder="Reason (required)" required maxLength={500} style={{ width: 150 }} /><Submit className="btn ghost sm">Save</Submit></ApiForm></td></tr>
        ))}</tbody></table></div>

      <div className="grid g2" style={{ marginTop: 20, alignItems: 'start' }}>
        <ApiForm action="/api/attendance/leave" reset className="card"><h3>Record approved leave / holiday</h3>
          <div className="grid g2"><div className="field"><label>Type</label><select name="kind"><option>Leave</option><option>Holiday</option></select></div>
            <div className="field"><label>Date</label><input type="date" name="day" required /></div></div>
          <div className="field"><label>Employee (for leave)</label><select name="user_id"><option value="">— All (holiday) —</option>{staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
          <div className="field"><label>Note</label><input name="note" maxLength={200} /></div><Submit>Save</Submit></ApiForm>
        <div className="card"><h3>Recent &amp; upcoming leaves / holidays</h3><ul className="timeline">
          {leaves.map((l) => (
            <li key={l.id}>{l.day} · <strong>{l.kind}</strong> · {l.name || 'Everyone'} <span className="muted small">{l.note}</span>{' '}
              <ApiForm action={`/api/attendance/leave/${l.id}/delete`} style={{ display: 'inline' }}><Submit className="btn ghost sm" confirm="Remove this entry?">Remove</Submit></ApiForm></li>
          ))}
          {!leaves.length && <li className="muted small">None recorded.</li>}</ul></div>
      </div>
    </Page>
  );
}
