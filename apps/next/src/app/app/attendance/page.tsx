import { db } from '@/lib/db';
import { requireUser } from '@/lib/auth';
import * as B from '@/lib/biz';
import * as U from '@/lib/util';
import { Page, Stat, Stats } from '@/components/ui';
import { ClockCard } from '@/components/clockcard';
import Link from 'next/link';
import { ATT_BADGE as CLS, LEAVE_BADGE, WEEKDAYS } from '@/lib/types';
import { employeeOf } from '@/lib/queries/payroll';
import { RequestDayOffButton } from '@/components/att-my-requests';

export const metadata = { title: 'My Attendance' };

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
  // Only this user's own requests and payslips (never anyone else's).
  const [emp, requests, payslips] = await Promise.all([
    employeeOf(u.id),
    db.all('SELECT * FROM leave_requests WHERE user_id=? ORDER BY created_at DESC LIMIT 30', [u.id]),
    db.all('SELECT id, period_kind, period_from, period_to, days, minutes, net_pay FROM payroll WHERE user_id=? ORDER BY period_from DESC LIMIT 24', [u.id]),
  ]);
  const span = (a: string, b: string) => (a === b ? U.longDate(a) : `${U.longDate(a)} – ${U.longDate(b)}`);
  return (
    <Page title="My Attendance" actions={emp ? <RequestDayOffButton today={today} /> : undefined} filters={
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

      <div className="grid g2" style={{ marginTop: 20, alignItems: 'start' }}>
        <div className="card"><h3>My day-off requests</h3>
          {!emp && <p className="small muted">You are not set up in attendance monitoring yet, so you cannot file requests. Please ask the owner or an admin.</p>}
          {requests.length ? <div className="tw"><table><thead><tr><th>Type</th><th>Date(s)</th><th>Status</th></tr></thead><tbody>
            {requests.map((r) => (
              <tr key={r.id}><td>{r.kind}<div className="small muted" style={{ overflowWrap: 'anywhere' }}>{r.reason}</div></td><td className="nowrap">{span(r.from_day, r.to_day)}</td>
                <td><span className={`badge ${LEAVE_BADGE[r.status] || ''}`}>{r.status}</span>
                  {r.status === 'Declined' && r.decline_reason && <div className="small"><strong>Reason:</strong> {r.decline_reason}</div>}</td></tr>
            ))}</tbody></table></div> : emp && <p className="small muted">No requests yet. Use “Request day off” at the top.</p>}
        </div>
        <div className="card"><h3>My payslips</h3>
          {payslips.length ? <div className="tw"><table><thead><tr><th>Period</th><th className="num">Hours</th><th className="num">Net pay</th><th></th></tr></thead><tbody>
            {payslips.map((p) => (
              <tr key={p.id}><td className="nowrap">{span(p.period_from, p.period_to)}<div className="small muted">{p.period_kind} · {p.days} days</div></td>
                <td className="num">{U.hrs(p.minutes)}</td><td className="num">{U.peso(p.net_pay)}</td><td><Link href={`/app/payslip/${p.id}`}>View</Link></td></tr>
            ))}</tbody></table></div> : <p className="small muted">No payslips yet. They appear here once payroll is generated for you.</p>}
        </div>
      </div>
    </Page>
  );
}
