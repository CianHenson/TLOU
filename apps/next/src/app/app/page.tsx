import Link from 'next/link';
import { requireUser, isOwner } from '@/lib/auth';
import { db } from '@/lib/db';
import * as B from '@/lib/biz';
import * as U from '@/lib/util';
import { flat } from '@/lib/list';
import { attendanceToday, period } from '@/lib/queries/owner';
import { airfareMonthly, airfareSummary, needsCheckin } from '@/lib/queries/airfare';
import { expenseMonthly, expenseTotal } from '@/lib/queries/expenses';
import { Page } from '@/components/ui';
import { ClockCard } from '@/components/clockcard';
import { DateRangeFilter } from '@/components/list-filters';
import { AirfareTrend, AttendanceDonut, ExpenseTrend, Panel } from '@/components/dash-charts';
import { AnnouncementCard } from '@/components/announcement-card';
import { getHistory, getPosts } from '@/lib/queries/announcement';
import { StaffCalendar, maxMonth } from '@/components/staff-calendar';
import { LEAVE_BADGE } from '@/lib/types';

export const metadata = { title: 'Dashboard' };

export default async function Dashboard(props: PageProps<'/app'>) {
  const user = await requireUser();
  const me = (await db.get('SELECT * FROM users WHERE id=?', [user.id]))!;
  const rec = (await db.get('SELECT * FROM attendance WHERE user_id=? AND day=?', [me.id, U.today()])) ?? null;
  const mins = B.workedMin(me, rec);
  const hello = <AnnouncementCard posts={await getPosts()} history={await getHistory()} owner={isOwner(user)} />;
  const clock = <ClockCard name={me.name} rec={rec} mins={mins} bar />;

  if (!isOwner(user)) {
    // One month at a time (left / right buttons); by default this month.
    const cal = String(flat(await props.searchParams).cal ?? '');
    const cur = U.today().slice(0, 7);
    const ym = /^\d{4}-(0[1-9]|1[0-2])$/.test(cal) && cal <= maxMonth(cur) ? cal : cur;
    const [days, requests] = await Promise.all([
      B.daily(me, ...U.monthRange(ym)),
      db.all('SELECT id, kind, from_day, to_day, status, decline_reason FROM leave_requests WHERE user_id=? ORDER BY created_at DESC LIMIT 6', [me.id]),
    ]);
    const span = (a: string, b: string) => (a === b ? U.longDate(a) : `${U.longDate(a)} – ${U.longDate(b)}`);
    return (
      <Page title="Dashboard">
        <div className="dash"><div className="dash-main">
        {hello}
        {clock}
        <div className="grid g2 dcal">
          <StaffCalendar ym={ym} rows={days} today={U.today()} />
          <div className="card reqcard"><h3>My requests</h3>
            {requests.length ? <ul className="reqlist">{requests.map((r) => (
              <li key={r.id}><div><strong>{r.kind}</strong><div className="small muted">{span(r.from_day, r.to_day)}</div>
                {r.status === 'Declined' && r.decline_reason && <div className="small">Reason: {r.decline_reason}</div>}</div>
                <span className={`badge ${LEAVE_BADGE[r.status] || ''}`}>{r.status}</span></li>
            ))}</ul> : <p className="small muted">You have not made any requests yet.</p>}
            <p className="small" style={{ marginBottom: 0 }}><Link href="/app/attendance">View all in My Attendance →</Link></p>
          </div>
        </div>
        </div></div>
      </Page>
    );
  }

  // Owner / admin: the figures that matter day to day - airfare sales and income, expenses, and attendance.
  const sp = flat(await props.searchParams);
  const per = period(sp);
  const months = U.monthsBack(per.to, 12);
  const [emp, air, soon, airMonths, expMonths, expenses] = await Promise.all([
    attendanceToday(), airfareSummary(per.from, per.to), needsCheckin(48), airfareMonthly(months), expenseMonthly(months), expenseTotal(per.from, per.to),
  ]);
  const net = air.income - expenses;
  const netSeries = airMonths.map((m, i) => m.income - expMonths[i]);
  const rng = `from=${per.from}&to=${per.to}`;
  const notIn = Math.max(0, emp.active - emp.timedIn - emp.absent);
  const attn = [
    { n: soon.length, label: 'flights need check-in (48 h)', href: '/app/airfare' },
    { n: emp.late, label: 'late today', href: '/app/attendance-monitor' },
    { n: emp.absent, label: 'absent today', href: '/app/attendance-monitor' },
    { n: emp.incomplete, label: 'incomplete attendance records', href: `/app/attendance-monitor?status=Incomplete&range=custom&from=${U.addDays(U.today(), -30)}&to=${U.today()}` },
  ];
  const open = attn.filter((a) => a.n > 0);
  return (
    <Page title="Dashboard" filters={
      <div className="af-bar"><DateRangeFilter today={U.today()} showBy={false} allowAll={false}
        initial={{ by: 'txn', from: per.from, to: per.to, range: per.key === 'custom' ? sp.range || 'custom' : ['month', 'year'].includes(per.key) ? per.key : 'custom' }} /></div>
    }>
      <div className="dash"><div className="dash-main">
      {hello}
      {clock}

      <div className="kpis">
        <Link className="kpi" href={`/app/airfare?${rng}`}><div className="l">Airfare sales</div><div className="n">{U.peso(air.total)}</div><div className="s">{air.n} tickets · {air.pax} pax</div></Link>
        <Link className={`kpi ${air.income >= 0 ? 'pos' : 'neg'}`} href={`/app/airfare?${rng}`}><div className="l">Agency income</div><div className="n">{U.peso(air.income)}</div><div className="s">Service charge − card fees</div></Link>
        <Link className="kpi" href={`/app/expenses?${rng}`}><div className="l">Expenses</div><div className="n">{U.peso(expenses)}</div><div className="s">Recorded in this period</div></Link>
        <Link className={`kpi ${net >= 0 ? 'pos' : 'neg'}`} href={`/app/finance-monitor?${rng}`}><div className="l">Net result</div><div className="n">{U.peso(net)}</div><div className="s">Agency income − expenses</div></Link>
      </div>

      <div className="attn" aria-label="Needs attention">
        {open.length
          ? open.map((a) => <Link key={a.label} href={a.href}><b>{a.n}</b>{a.label}</Link>)
          : <span className="ok"><b>✓</b>Nothing needs attention right now</span>}
      </div>

      <div className="dgrid">
        <Panel title="Airfare sales & income" sub="Last 12 months"><AirfareTrend data={airMonths} /></Panel>
        <Panel title="Expenses & net result" sub="Last 12 months"><ExpenseTrend months={months} expenses={expMonths} net={netSeries} /></Panel>
        <Panel title="Attendance today" sub={`${emp.clockedIn} clocked in now`}><AttendanceDonut onTime={Math.max(0, emp.timedIn - emp.late)} late={emp.late} absent={emp.absent} pending={notIn} /></Panel>
      </div>
      </div></div>
    </Page>
  );
}
