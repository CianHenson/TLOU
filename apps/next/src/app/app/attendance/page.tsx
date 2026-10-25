import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import * as B from '@/lib/biz';
import * as U from '@/lib/util';
import { Page, Stat, Stats } from '@/components/ui';
import { ClockCard } from '@/components/clockcard';
import { WEEKDAYS } from '@/lib/types';

export const metadata = { title: 'My Attendance' };
const CLS: Record<string, string> = { Present: 'b-ok', Late: 'b-warn', Absent: 'b-err', Incomplete: 'b-err', 'Clocked in': 'b-info', 'Approved leave': 'b-info' };

export default async function Attendance({ searchParams }: PageProps<'/app/attendance'>) {
  const me = await requireUser();
  const q = await searchParams;
  const u = (await db.get('SELECT * FROM users WHERE id=?', [me.id]))!;
  const today = U.today();
  const m = String(Array.isArray(q.month) ? q.month[0] : q.month ?? '');
  const ym = /^\d{4}-\d{2}$/.test(m) ? m : today.slice(0, 7);
  const [from, to] = U.monthRange(ym);
  const rows = (await B.daily(u, from, to)).reverse();
  const rec = (await db.get('SELECT * FROM attendance WHERE user_id=? AND day=?', [u.id, today])) ?? null;
  const sum = B.summarize(u, rows), sched = B.schedFor(u);
  return (
    <Page title="My Attendance" filters={
      <form className="filters" method="get"><div><label htmlFor="m">Month</label><input id="m" type="month" name="month" defaultValue={ym} /></div><div className="btnrow"><button className="btn ghost">Show</button></div></form>
    }>
      <ClockCard name={me.name} rec={rec} mins={B.workedMin(u, rec)} />
      <div className="card small muted">Your schedule: {sched.start}–{sched.end} · grace period {sched.grace} min · unpaid break {sched.brk} min · workdays {sched.days.map((d) => WEEKDAYS[d]).join(', ')}. Times are recorded by the server in Asia/Manila time.</div>

      <Stats>
        <Stat n={sum.days} label="Days attended" />
        <Stat n={sum.late} label="Late arrivals" />
        <Stat n={sum.absent} label="Absences" />
        <Stat n={sum.incomplete} label="Incomplete" />
        <Stat n={U.hrs(sum.mins)} label="Total hours" />
      </Stats>
      <div className="tw"><table>
        <thead><tr><th>Date</th><th>Status</th><th>Time in</th><th>Time out</th><th className="num">Hours</th></tr></thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.day}><td className="nowrap">{r.day} <span className="muted small">{WEEKDAYS[U.dow(r.day)]}</span></td>
              <td><span className={`badge ${CLS[r.status] || ''}`}>{r.status}</span>{r.late && r.late_min ? <> <span className="small muted">+{r.late_min} min</span></> : null}</td>
              <td>{r.rec?.time_in ? r.rec.time_in.slice(11, 16) : '—'}</td><td>{r.rec?.time_out ? r.rec.time_out.slice(11, 16) : '—'}</td><td className="num">{r.mins ? U.hrs(r.mins) : '—'}</td></tr>
          ))}
          {!rows.length && <tr><td colSpan={5} className="empty">No records for this month.</td></tr>}
        </tbody></table></div>
    </Page>
  );
}
