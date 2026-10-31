import { requireUser } from '@/lib/auth';
import * as U from '@/lib/util';
import { WEEKDAYS } from '@/lib/types';
import { flat } from '@/lib/list';
import { attendanceReport } from '@/lib/queries/owner';
import { Page } from '@/components/ui';
import { PrintButton } from '@/components/widgets';

export const metadata = { title: 'Monthly Attendance Report' };

export default async function AttendanceReport(props: PageProps<'/app/attendance-report'>) {
  await requireUser('owner');
  const q = flat(await props.searchParams);
  const ym = /^\d{4}-\d{2}$/.test(q.month || '') ? q.month : U.today().slice(0, 7);
  const uid = /^\d+$/.test(q.employee || '') ? Number(q.employee) : null;
  const { all, detail, sums, prev, compare, corr } = await attendanceReport(ym, uid);
  const base = `/api/attendance-report/export?month=${ym}&employee=${uid || ''}`;
  const hm = (s?: string | null) => U.hm12(s);
  return (
    <Page title="Monthly Attendance Report">
      <form className="card filters noprint" method="get">
        <div><label>Month</label><input type="month" name="month" defaultValue={ym} /></div>
        <div><label>Employee</label><select name="employee" defaultValue={uid ? String(uid) : ''}><option value="">All employees</option>{all.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}</select></div>
        <div className="btnrow"><button className="btn">Generate</button>
          <a className="btn ghost" href={base}>Summary CSV</a><a className="btn ghost" href={`${base}&detail=1`}>Daily detail CSV</a><PrintButton className="btn ghost">PDF / Print</PrintButton></div>
      </form>
      <h2>Summary — {ym}</h2>
      <div className="tw"><table><thead><tr><th>ID</th><th>Employee</th><th className="num">Scheduled days</th><th className="num">Attended</th><th className="num">Absent</th><th className="num">Approved leave</th><th className="num">Late</th><th className="num">Incomplete</th><th className="num">Total hrs</th><th className="num">Avg hrs/day</th><th className="num">Attendance %</th></tr></thead><tbody>
        {sums.map((s) => <tr key={s.user.id}><td>{s.user.emp_no}</td><td>{s.user.name}</td><td className="num">{s.scheduled}</td><td className="num">{s.days}</td><td className="num">{s.absent}</td><td className="num">{s.leave}</td><td className="num">{s.late}</td><td className="num">{s.incomplete}</td><td className="num">{U.hrs(s.mins)}</td><td className="num">{U.hrs(s.avg)}</td><td className="num">{s.pct}%</td></tr>)}
        {!sums.length && <tr><td colSpan={11} className="empty">No employees.</td></tr>}</tbody></table></div>
      <p className="small muted">Scheduled days exclude rest days, holidays, approved leave and days not yet ended. Attendance % = scheduled days attended ÷ scheduled days elapsed.</p>

      <h2 style={{ marginTop: 22 }}>Comparison with previous months</h2>
      <div className="tw"><table><thead><tr><th>Employee</th>{prev.map((m) => <th key={m} className="num">{m}</th>)}<th className="num">{ym}</th></tr></thead><tbody>
        {compare.map((c, i) => (
          <tr key={c.u.id}><td>{c.u.name}</td>{c.months.map((m) => <td key={m.m} className="num">{m.pct}% · {m.late} late · {m.absent} abs</td>)}<td className="num"><strong>{sums[i].pct}% · {sums[i].late} late · {sums[i].absent} abs</strong></td></tr>
        ))}</tbody></table></div>

      <h2 style={{ marginTop: 22 }}>Daily detail</h2>
      {detail.map((d) => (
        <div key={d.u.id}>
          <h3>{d.u.name} <span className="muted small">{d.u.emp_no}</span></h3>
          <div className="tw" style={{ marginBottom: 16 }}><table><thead><tr><th>Date</th><th>Status</th><th>In</th><th>Out</th><th className="num">Late (min)</th><th className="num">Hours</th></tr></thead><tbody>
            {d.rows.map((r) => <tr key={r.day}><td className="nowrap">{r.day} <span className="muted small">{WEEKDAYS[U.dow(r.day)]}</span></td><td>{r.status}</td><td>{hm(r.rec?.time_in) || '—'}</td><td>{hm(r.rec?.time_out) || '—'}</td><td className="num">{r.late_min || ''}</td><td className="num">{r.mins ? U.hrs(r.mins) : ''}</td></tr>)}</tbody></table></div>
        </div>
      ))}

      <h2>Corrections made this month</h2>
      <div className="tw"><table><thead><tr><th>When</th><th>Employee</th><th>Date</th><th>Original</th><th>Corrected</th><th>Reason</th><th>By</th></tr></thead><tbody>
        {corr.map((c) => <tr key={c.id}><td>{U.dt12(c.at)}</td><td>{c.who}</td><td>{c.day}</td><td>{hm(c.old_in) || '—'} → {hm(c.old_out) || '—'}</td><td>{hm(c.new_in)} → {c.new_out ? hm(c.new_out) : '—'}</td><td>{c.reason}</td><td>{c.by_name}</td></tr>)}
        {!corr.length && <tr><td colSpan={7} className="empty">No corrections.</td></tr>}</tbody></table></div>
    </Page>
  );
}
