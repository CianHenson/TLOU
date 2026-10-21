import { useQuery } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { download, get } from '../../../lib/api';
import { hrs } from '../../../lib/format';
import { usePageTitle } from '../../../lib/title';
import { dowOf, hm, type DayRow, type PublicUser, type Summary } from './shared';

interface Report {
  ym: string; uid: number | null; all: { id: number; name: string }[];
  detail: { u: PublicUser; rows: DayRow[] }[]; sums: Summary[]; prev: string[];
  compare: { u: PublicUser; months: { m: string; pct: number; late: number; absent: number; hrs: number }[] }[];
  corr: { id: number; at: string; who: string; day: string; old_in: string | null; old_out: string | null; new_in: string; new_out: string | null; reason: string; by_name: string }[];
}

export default function AttendanceReport() {
  usePageTitle('Monthly Attendance Report');
  const [sp, setSp] = useSearchParams();
  const qs = sp.toString();
  const { data } = useQuery({ queryKey: ['attendance-report', qs], queryFn: () => get<Report>('/attendance/report' + (qs ? `?${qs}` : '')) });
  if (!data) return <p className="muted">Loading…</p>;
  const { ym, uid, all, detail, sums, prev, compare, corr } = data;

  const generate = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const next: Record<string, string> = {};
    for (const k of ['month', 'employee']) if (f.get(k)) next[k] = String(f.get(k));
    setSp(next);
  };
  const csv = (detailToo = false) =>
    download(`/attendance/report?month=${ym}&employee=${uid ?? ''}&export=csv${detailToo ? '&detail=1' : ''}`);

  return (
    <>
      <form className="card filters noprint" onSubmit={generate} key={`${ym}-${uid}`}>
        <div><label>Month</label><input type="month" name="month" defaultValue={ym} /></div>
        <div><label>Employee</label>
          <select name="employee" defaultValue={uid ?? ''}>
            <option value="">All employees</option>
            {all.map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select></div>
        <div className="btnrow">
          <button className="btn">Generate</button>
          <button type="button" className="btn ghost" onClick={() => csv()}>Summary CSV</button>
          <button type="button" className="btn ghost" onClick={() => csv(true)}>Daily detail CSV</button>
          <button type="button" className="btn ghost" onClick={() => window.print()}>PDF / Print</button>
        </div>
      </form>

      <h2>Summary — {ym}</h2>
      <div className="tw"><table>
        <thead><tr><th>ID</th><th>Employee</th><th className="num">Scheduled days</th><th className="num">Attended</th><th className="num">Absent</th><th className="num">Approved leave</th><th className="num">Late</th><th className="num">Incomplete</th><th className="num">Total hrs</th><th className="num">Avg hrs/day</th><th className="num">Attendance %</th></tr></thead>
        <tbody>
          {sums.map((s) => (
            <tr key={s.user.id}>
              <td>{s.user.emp_no}</td><td>{s.user.name}</td><td className="num">{s.scheduled}</td><td className="num">{s.days}</td><td className="num">{s.absent}</td>
              <td className="num">{s.leave}</td><td className="num">{s.late}</td><td className="num">{s.incomplete}</td><td className="num">{hrs(s.mins)}</td>
              <td className="num">{hrs(s.avg)}</td><td className="num">{s.pct}%</td>
            </tr>
          ))}
          {!sums.length && <tr><td colSpan={11} className="empty">No employees.</td></tr>}
        </tbody>
      </table></div>
      <p className="small muted">Scheduled days exclude rest days, holidays, approved leave and days not yet ended. Attendance % = scheduled days attended ÷ scheduled days elapsed.</p>

      <h2 style={{ marginTop: 22 }}>Comparison with previous months</h2>
      <div className="tw"><table>
        <thead><tr><th>Employee</th>{prev.map((m) => <th key={m} className="num">{m}</th>)}<th className="num">{ym}</th></tr></thead>
        <tbody>
          {compare.map((c, i) => (
            <tr key={c.u.id}>
              <td>{c.u.name}</td>
              {c.months.map((m) => <td key={m.m} className="num">{m.pct}% · {m.late} late · {m.absent} abs</td>)}
              <td className="num"><strong>{sums[i].pct}% · {sums[i].late} late · {sums[i].absent} abs</strong></td>
            </tr>
          ))}
        </tbody>
      </table></div>

      <h2 style={{ marginTop: 22 }}>Daily detail</h2>
      {detail.map((d) => (
        <div key={d.u.id}>
          <h3>{d.u.name} <span className="muted small">{d.u.emp_no}</span></h3>
          <div className="tw" style={{ marginBottom: 16 }}><table>
            <thead><tr><th>Date</th><th>Status</th><th>In</th><th>Out</th><th className="num">Late (min)</th><th className="num">Hours</th></tr></thead>
            <tbody>
              {d.rows.map((r) => (
                <tr key={r.day}>
                  <td className="nowrap">{r.day} <span className="muted small">{dowOf(r.day)}</span></td><td>{r.status}</td>
                  <td>{hm(r.rec?.time_in)}</td><td>{hm(r.rec?.time_out)}</td><td className="num">{r.late_min || ''}</td><td className="num">{r.mins ? hrs(r.mins) : ''}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      ))}

      <h2>Corrections made this month</h2>
      <div className="tw"><table>
        <thead><tr><th>When</th><th>Employee</th><th>Date</th><th>Original</th><th>Corrected</th><th>Reason</th><th>By</th></tr></thead>
        <tbody>
          {corr.map((c) => (
            <tr key={c.id}>
              <td>{c.at.slice(0, 16)}</td><td>{c.who}</td><td>{c.day}</td>
              <td>{hm(c.old_in)} → {hm(c.old_out)}</td><td>{hm(c.new_in)} → {hm(c.new_out)}</td><td>{c.reason}</td><td>{c.by_name}</td>
            </tr>
          ))}
          {!corr.length && <tr><td colSpan={7} className="empty">No corrections.</td></tr>}
        </tbody>
      </table></div>
    </>
  );
}
