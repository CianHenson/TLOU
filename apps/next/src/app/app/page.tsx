import Link from 'next/link';
import { requireUser, isOwner } from '@/lib/auth';
import { db } from '@/lib/db';
import * as B from '@/lib/biz';
import * as U from '@/lib/util';
import { flat } from '@/lib/list';
import { counts as getCounts, ownerDashboard, period } from '@/lib/queries/owner';
import { airfareMonthly, airfareSummary, needsCheckin } from '@/lib/queries/airfare';
import { Page } from '@/components/ui';
import { ClockCard } from '@/components/clockcard';
import { DateRangeFilter } from '@/components/list-filters';
import { OwnerCharts } from '@/components/owner-charts';
import { AirfareTrend, AttendanceDonut, MoneyTrend, Panel } from '@/components/dash-charts';
import { AnnouncementCard } from '@/components/announcement-card';
import { announcementHistory, getAnnouncements } from '@/lib/queries/announcement';
import { StaffCalendar } from '@/components/staff-calendar';
import { LEAVE_BADGE } from '@/lib/types';

export const metadata = { title: 'Dashboard' };

export default async function Dashboard(props: PageProps<'/app'>) {
  const user = await requireUser();
  const me = (await db.get('SELECT * FROM users WHERE id=?', [user.id]))!;
  const rec = (await db.get('SELECT * FROM attendance WHERE user_id=? AND day=?', [me.id, U.today()])) ?? null;
  const mins = B.workedMin(me, rec);
  const counts = await getCounts();
  const [ann, annLog] = await Promise.all([getAnnouncements(), announcementHistory()]);
  const hello = <AnnouncementCard pinned={ann.pinned} regular={ann.regular} history={annLog} owner={isOwner(user)} />;
  const clock = <ClockCard name={me.name} rec={rec} mins={mins} bar />;

  if (!isOwner(user)) {
    const cal = String(flat(await props.searchParams).cal ?? '');
    const ym = /^\d{4}-(0[1-9]|1[0-2])$/.test(cal) && cal <= U.today().slice(0, 7) ? cal : U.today().slice(0, 7);
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

  const sp = flat(await props.searchParams);
  const per = period(sp);
  const months = U.monthsBack(per.to, 12);
  const [{ f, emp, chart }, air, soon, airMonths] = await Promise.all([ownerDashboard(per.from, per.to), airfareSummary(per.from, per.to), needsCheckin(48), airfareMonthly(months)]);
  const rng = `from=${per.from}&to=${per.to}`;
  const notIn = Math.max(0, emp.active - emp.timedIn - emp.absent);
  const attn = [
    { n: soon.length, label: 'flights need check-in (48 h)', href: '/app/airfare' },
    { n: counts.pending, label: 'pending requests', href: '/app/requests?status=Pending+Review' },
    { n: emp.late, label: 'late today', href: '/app/attendance-monitor' },
    { n: emp.absent, label: 'absent today', href: '/app/attendance-monitor' },
    { n: emp.incomplete, label: 'incomplete attendance records', href: '/app/attendance-monitor' },
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
        <Link className="kpi" href="/app/finance-monitor"><div className="l">Booking sales</div><div className="n">{U.peso(f.booking_sales)}</div><div className="s">{U.peso(f.collected)} collected</div></Link>
        <Link className="kpi" href={`/app/airfare?${rng}`}><div className="l">Airfare collected</div><div className="n">{U.peso(air.total)}</div><div className="s">{air.n} tickets · {air.pax} pax</div></Link>
        <Link className={`kpi ${air.income >= 0 ? 'pos' : 'neg'}`} href={`/app/finance-monitor?${rng}`}><div className="l">Agency income</div><div className="n">{U.peso(air.income)}</div><div className="s">Service charge − card fees</div></Link>
        <Link className={`kpi ${f.net >= 0 ? 'pos' : 'neg'}`} href="/app/finance-monitor"><div className="l">Net operating result</div><div className="n">{U.peso(f.net)}</div><div className="s">{U.peso(f.expenses)} expenses</div></Link>
      </div>

      <div className="attn" aria-label="Needs attention">
        {open.length
          ? open.map((a) => <Link key={a.label} href={a.href}><b>{a.n}</b>{a.label}</Link>)
          : <span className="ok"><b>✓</b>Nothing needs attention right now</span>}
      </div>

      <div className="dgrid">
        <Panel title="Sales, expenses & net result" sub="Last 12 months" span><MoneyTrend months={chart.months} sales={chart.sales} expenses={chart.expenses} net={chart.net} /></Panel>
        <Panel title="Attendance today" sub={`${emp.clockedIn} clocked in now`}><AttendanceDonut onTime={Math.max(0, emp.timedIn - emp.late)} late={emp.late} absent={emp.absent} pending={notIn} /></Panel>
        <Panel title="Airfare sales" sub="Last 12 months" span><AirfareTrend data={airMonths} /></Panel>
        <Panel title="Period summary" sub={`${per.from} → ${per.to}`}>
          <dl className="dsum">
            <div><dt>Booking sales</dt><dd>{U.peso(f.booking_sales)}</dd></div>
            <div><dt>Payments collected</dt><dd>{U.peso(f.collected)}</dd></div>
            <div><dt>Supplier costs</dt><dd>{U.peso(f.supplier_costs)}</dd></div>
            <div><dt>Operating expenses</dt><dd>{U.peso(f.expenses)}</dd></div>
            <div><dt>Net operating result</dt><dd className={f.net >= 0 ? 'pos' : 'neg'}>{U.peso(f.net)}</dd></div>
            <div><dt>Active employees</dt><dd>{emp.active}</dd></div>
          </dl>
        </Panel>
      </div>

      <details className="more">
        <summary>More analytics</summary>
        <OwnerCharts d={chart} />
      </details>
      </div></div>
    </Page>
  );
}
