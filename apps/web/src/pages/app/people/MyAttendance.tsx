import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { get, post } from '../../../lib/api';
import { useFlash } from '../../../lib/flash';
import { hrs } from '../../../lib/format';
import { usePageTitle } from '../../../lib/title';
import Stat, { Stats } from '../../../ui/Stat';
import { ClockCard, DOW, dowOf, hm, StatusBadge, type DayRow, type Rec, type Summary } from './shared';

interface Me {
  name: string; rec: Rec | null; rows: DayRow[]; ym: string; sum: Summary; todayMins: number; nowStr: string;
  sched: { start: string; end: string; grace: number; brk: number; days: number[] };
}

export default function MyAttendance() {
  usePageTitle('My Attendance');
  const [sp, setSp] = useSearchParams();
  const month = sp.get('month') ?? '';
  const qc = useQueryClient();
  const flash = useFlash();

  const { data } = useQuery({ queryKey: ['attendance-me', month], queryFn: () => get<Me>('/attendance/me' + (month ? `?month=${month}` : '')) });
  const clock = useMutation({
    mutationFn: (which: 'in' | 'out') => post<{ message: string }>(`/attendance/${which}`),
    onSuccess: (r) => flash.ok(r.message),
    onError: (e: Error) => flash.err(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: ['attendance-me'] }),
  });

  if (!data) return <p className="muted">Loading…</p>;
  const { sched, sum, rows } = data;

  const show = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const m = String(new FormData(e.currentTarget).get('month') ?? '');
    setSp(m ? { month: m } : {});
  };

  return (
    <>
      <ClockCard name={data.name} rec={data.rec} mins={data.todayMins} nowStr={data.nowStr} busy={clock.isPending}
        onIn={() => clock.mutate('in')} onOut={() => clock.mutate('out')} />
      <div className="card small muted">
        Your schedule: {sched.start}–{sched.end} · grace period {sched.grace} min · unpaid break {sched.brk} min · workdays {sched.days.map((d) => DOW[d]).join(', ')}.
        Times are recorded by the server in Asia/Manila time.
      </div>

      <form className="filters" onSubmit={show} key={data.ym}>
        <div><label htmlFor="m">Month</label><input id="m" type="month" name="month" defaultValue={data.ym} /></div>
        <div className="btnrow"><button className="btn ghost">Show</button></div>
      </form>
      <Stats>
        <Stat n={sum.days} label="Days attended" />
        <Stat n={sum.late} label="Late arrivals" />
        <Stat n={sum.absent} label="Absences" />
        <Stat n={sum.incomplete} label="Incomplete" />
        <Stat n={hrs(sum.mins)} label="Total hours" />
      </Stats>
      <div className="tw"><table>
        <thead><tr><th>Date</th><th>Status</th><th>Time in</th><th>Time out</th><th className="num">Hours</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.day}>
              <td className="nowrap">{r.day} <span className="muted small">{dowOf(r.day)}</span></td>
              <td><StatusBadge status={r.status} />{r.late && r.late_min ? <> <span className="small muted">+{r.late_min} min</span></> : null}</td>
              <td>{hm(r.rec?.time_in)}</td><td>{hm(r.rec?.time_out)}</td><td className="num">{r.mins ? hrs(r.mins) : '—'}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={5} className="empty">No records for this month.</td></tr>}
        </tbody>
      </table></div>
    </>
  );
}
