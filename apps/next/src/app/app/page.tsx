import Link from 'next/link';
import { requireUser, isOwner } from '@/lib/auth';
import { db } from '@/lib/db';
import * as B from '@/lib/biz';
import * as U from '@/lib/util';
import { flat } from '@/lib/list';
import { counts as getCounts, ownerDashboard, period, staffDashboard } from '@/lib/queries/owner';
import { airfareMonthly, airfareSummary, needsCheckin } from '@/lib/queries/airfare';
import { Page, Stat, Stats } from '@/components/ui';
import { ClockCard } from '@/components/clockcard';
import { DateRangeFilter } from '@/components/list-filters';
import { OwnerCharts } from '@/components/owner-charts';
import { AirfareTrend, AttendanceDonut, MoneyTrend, Panel } from '@/components/dash-charts';
import { AnnouncementCard } from '@/components/announcement-card';
import { announcementHistory, getAnnouncement } from '@/lib/queries/announcement';

export const metadata = { title: 'Dashboard' };

export default async function Dashboard(props: PageProps<'/app'>) {
  const user = await requireUser();
  const me = (await db.get('SELECT * FROM users WHERE id=?', [user.id]))!;
  const rec = (await db.get('SELECT * FROM attendance WHERE user_id=? AND day=?', [me.id, U.today()])) ?? null;
  const mins = B.workedMin(me, rec);
  const counts = await getCounts();
  const [ann, annLog] = await Promise.all([getAnnouncement(), announcementHistory()]);
  const hello = <AnnouncementCard a={ann} history={annLog} />;
  const clock = <ClockCard name={me.name} rec={rec} mins={mins} bar />;

  if (!isOwner(user)) {
    const [{ mine, newest }, soon] = await Promise.all([staffDashboard(me), needsCheckin(48)]);
    return (
      <Page title="Dashboard">
        <div className="dash"><div className="dash-main">
        {hello}
        {clock}
        <Stats>
          <Stat icon="✈️" n={soon.length} label="Flights needing check-in (48 h)" tone={soon.length ? 'neg' : undefined} href="/app/airfare" />
          <Stat icon="📝" n={counts.pending} label="Pending requests" href="/app/requests?status=Pending+Review" />
          <Stat icon="📂" n={counts.open_requests} label="Open requests" href="/app/requests?status=open" />
          <Stat icon="✅" n={counts.confirmed} label="Confirmed bookings" href="/app/bookings?status=Confirmed" />
          <Stat icon="👥" n={counts.customers} label="Customers" href="/app/customers" />
        </Stats>
        <div className="grid g2">
          <div className="card"><h3>New requests awaiting review</h3>
            {!newest.length && <p className="muted">Nothing pending. 🎉</p>}
            <ul className="timeline">{newest.map((r) => <li key={r.id}><Link href={`/app/requests/${r.id}`}>{r.ref}</Link> · {r.customer}<div className="small muted">{r.service_type} · {r.created_at.slice(0, 16)}</div></li>)}</ul>
          </div>
          <div className="card"><h3>My open requests</h3>
            {!mine.length && <p className="muted">No open requests assigned to you.</p>}
            <ul className="timeline">{mine.map((r) => <li key={r.id}><Link href={`/app/requests/${r.id}`}>{r.ref}</Link> · {r.customer} <span className="badge">{r.status}</span></li>)}</ul>
          </div>
        </div>
        <div className="row"><Link className="btn" href="/app/requests/new">Register a walk-in / phone request</Link> <Link className="btn ghost" href="/app/customers/new">New customer</Link> <Link className="btn ghost" href="/app/bookings/new">New booking</Link></div>
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

      <div className="kpis">
        <Link className="kpi" href={`/app/finance?${rng}`}><div className="l">Booking sales</div><div className="n">{U.peso(f.booking_sales)}</div><div className="s">{U.peso(f.collected)} collected</div></Link>
        <Link className="kpi" href={`/app/airfare?${rng}`}><div className="l">Airfare collected</div><div className="n">{U.peso(air.total)}</div><div className="s">{air.n} tickets · {air.pax} pax</div></Link>
        <Link className={`kpi ${air.income >= 0 ? 'pos' : 'neg'}`} href={`/app/finance-monitor?${rng}`}><div className="l">Agency income</div><div className="n">{U.peso(air.income)}</div><div className="s">Service charge − card fees</div></Link>
        <Link className={`kpi ${f.net >= 0 ? 'pos' : 'neg'}`} href={`/app/finance?${rng}`}><div className="l">Net operating result</div><div className="n">{U.peso(f.net)}</div><div className="s">{U.peso(f.expenses)} expenses</div></Link>
      </div>

      {clock}

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
