import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError, del, download, get, post } from '../../../lib/api';
import { useFlash } from '../../../lib/flash';
import { hrs } from '../../../lib/format';
import { usePageTitle } from '../../../lib/title';
import { hm, StatusBadge, type DayRow, type PublicUser } from './shared';

interface Row { u: PublicUser; d: Partial<DayRow> & { status: string; mins: number; late_min: number } }
interface Leave { id: number; user_id: number | null; day: string; kind: 'Leave' | 'Holiday'; note: string; name: string | null }
interface Monitor { day: string; today: string; nowStr: string; rows: Row[]; leaves: Leave[]; staff: { id: number; name: string }[] }

/** Inline "correct this record" form for one employee/day (original per-row form). */
function CorrectRow({ r, day, onDone }: { r: Row; day: string; onDone: () => void }) {
  const flash = useFlash();
  const [tin, setTin] = useState(r.d.rec?.time_in?.slice(11, 16) ?? '');
  const [tout, setTout] = useState(r.d.rec?.time_out?.slice(11, 16) ?? '');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await post<{ message: string }>('/attendance/correct', { user_id: r.u.id, day, time_in: tin, time_out: tout, reason });
      flash.ok(res.message);
      onDone();
    } catch (err) {
      flash.err(err instanceof ApiError ? err.message : 'Could not save the correction.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="row" onSubmit={save}>
      <input type="time" value={tin} onChange={(e) => setTin(e.target.value)} required style={{ width: 105 }} />
      <input type="time" value={tout} onChange={(e) => setTout(e.target.value)} style={{ width: 105 }} />
      <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (required)" required maxLength={500} style={{ width: 150 }} />
      <button className="btn ghost sm" disabled={busy}>Save</button>
    </form>
  );
}

export default function AttendanceMonitor() {
  usePageTitle('Attendance Monitoring');
  const [sp, setSp] = useSearchParams();
  const dayParam = sp.get('day') ?? '';
  const qc = useQueryClient();
  const flash = useFlash();
  const [leave, setLeave] = useState({ kind: 'Leave', day: '', user_id: '', note: '' });

  const { data } = useQuery({ queryKey: ['attendance-monitor', dayParam], queryFn: () => get<Monitor>('/attendance/monitor' + (dayParam ? `?day=${dayParam}` : '')) });
  if (!data) return <p className="muted">Loading…</p>;
  const { day, rows, leaves, staff } = data;
  const refresh = () => qc.invalidateQueries({ queryKey: ['attendance-monitor'] });

  const show = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const d = String(new FormData(e.currentTarget).get('day') ?? '');
    setSp(d ? { day: d } : {});
  };
  const addLeave = async (e: FormEvent) => {
    e.preventDefault();
    try {
      const res = await post<{ message: string }>('/attendance/leave', leave);
      flash.ok(res.message);
      setLeave({ kind: 'Leave', day: '', user_id: '', note: '' });
      refresh();
    } catch (err) {
      flash.err(err instanceof ApiError ? err.message : 'Could not save.');
    }
  };
  const removeLeave = async (id: number) => {
    if (!window.confirm('Remove this entry?')) return;
    await del(`/attendance/leave/${id}`);
    refresh();
  };

  return (
    <>
      <form className="filters" onSubmit={show} key={day}>
        <div><label>Date</label><input type="date" name="day" defaultValue={day} max={data.today} /></div>
        <div className="btnrow">
          <button className="btn">Show</button>
          <button type="button" className="btn ghost" onClick={() => download(`/attendance/monitor?day=${day}&export=csv`)}>Export CSV</button>
          <Link className="btn ghost" to="/app/attendance-report">Monthly reports →</Link>
        </div>
      </form>
      <p className="muted small">Live view as of {data.nowStr.slice(11, 16)} (Asia/Manila). Absences are only flagged after the employee's shift end.</p>
      <div className="tw"><table>
        <thead><tr><th>Employee</th><th>Schedule</th><th>Status</th><th>Time in</th><th>Time out</th><th className="num">Late (min)</th><th className="num">Hours</th><th>Correct record</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.u.id}>
              <td>{r.u.name}<div className="small muted">{r.u.emp_no}</div></td>
              <td className="nowrap">{r.u.sched_start}–{r.u.sched_end} (+{r.u.grace_min})</td>
              <td><StatusBadge status={r.d.status} /></td>
              <td>{hm(r.d.rec?.time_in)}</td><td>{hm(r.d.rec?.time_out)}</td>
              <td className="num">{r.d.late_min || ''}</td><td className="num">{r.d.mins ? hrs(r.d.mins) : ''}</td>
              <td><CorrectRow key={`${r.u.id}-${day}-${r.d.rec?.time_in}-${r.d.rec?.time_out}`} r={r} day={day} onDone={refresh} /></td>
            </tr>
          ))}
        </tbody>
      </table></div>

      <div className="grid g2" style={{ marginTop: 20, alignItems: 'start' }}>
        <form className="card" onSubmit={addLeave}>
          <h3>Record approved leave / holiday</h3>
          <div className="grid g2">
            <div className="field"><label>Type</label>
              <select value={leave.kind} onChange={(e) => setLeave({ ...leave, kind: e.target.value })}><option>Leave</option><option>Holiday</option></select></div>
            <div className="field"><label>Date</label><input type="date" value={leave.day} onChange={(e) => setLeave({ ...leave, day: e.target.value })} required /></div>
          </div>
          <div className="field"><label>Employee (for leave)</label>
            <select value={leave.user_id} onChange={(e) => setLeave({ ...leave, user_id: e.target.value })}>
              <option value="">— All (holiday) —</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></div>
          <div className="field"><label>Note</label><input value={leave.note} onChange={(e) => setLeave({ ...leave, note: e.target.value })} maxLength={200} /></div>
          <button className="btn">Save</button>
        </form>
        <div className="card"><h3>Recent &amp; upcoming leaves / holidays</h3>
          <ul className="timeline">
            {leaves.map((l) => (
              <li key={l.id}>{l.day} · <strong>{l.kind}</strong> · {l.name || 'Everyone'} <span className="muted small">{l.note}</span>{' '}
                <button className="btn ghost sm" onClick={() => removeLeave(l.id)}>Remove</button></li>
            ))}
            {!leaves.length && <li className="muted small">None recorded.</li>}
          </ul>
        </div>
      </div>
    </>
  );
}
