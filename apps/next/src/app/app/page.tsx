import Link from 'next/link';
import { requireUser, isOwner } from '@/lib/auth';
import { db } from '@/lib/db';
import * as B from '@/lib/biz';
import * as U from '@/lib/util';
import { flat } from '@/lib/list';
import { counts as getCounts, ownerDashboard, period, staffDashboard } from '@/lib/queries/owner';
import { airfareSummary, needsCheckin } from '@/lib/queries/airfare';
import { Page, Stat, Stats } from '@/components/ui';
import { ClockCard } from '@/components/clockcard';
import { PeriodFilter } from '@/components/owner-bits';
import { OwnerCharts } from '@/components/owner-charts';

export const metadata = { title: 'Dashboard' };

export default async function Dashboard(props: PageProps<'/app'>) {
  const user = await requireUser();
  const me = (await db.get('SELECT * FROM users WHERE id=?', [user.id]))!;
  const rec = (await db.get('SELECT * FROM attendance WHERE user_id=? AND day=?', [me.id, U.today()])) ?? null;
  const mins = B.workedMin(me, rec);
  const counts = await getCounts();
  const clock = <ClockCard name={me.name} rec={rec} mins={mins} />;

  if (!isOwner(user)) {
    const [{ mine, newest }, soon] = await Promise.all([staffDashboard(me), needsCheckin(48)]);
    return (
      <Page title="Dashboard">
        {clock}
        <Stats>
          <Stat n={soon.length} label="Flights needing check-in (48 h)" tone={soon.length ? 'neg' : undefined} href="/app/airfare" />
          <Stat n={counts.pending} label="Pending requests" href="/app/requests?status=Pending+Review" />
          <Stat n={counts.open_requests} label="Open requests" href="/app/requests?status=open" />
          <Stat n={counts.confirmed} label="Confirmed bookings" href="/app/bookings?status=Confirmed" />
          <Stat n={counts.customers} label="Customers" href="/app/customers" />
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
      </Page>
    );
  }

  const per = period(flat(await props.searchParams));
  const [{ f, emp, chart }, air, soon] = await Promise.all([ownerDashboard(per.from, per.to), airfareSummary(per.from, per.to), needsCheckin(48)]);
  const rng = `from=${per.from}&to=${per.to}`;
  return (
    <Page title="Dashboard" filters={
      <PeriodFilter per={per} />
    }>
      <h2>Airfare sales</h2>
      <Stats>
        <Stat n={soon.length} label="Flights needing check-in (next 48 h)" tone={soon.length ? 'neg' : undefined} href="/app/airfare" />
        <Stat n={air.n} label={`Tickets sold · ${air.pax} pax`} href={`/app/airfare?${rng}`} />
        <Stat n={U.peso(air.total)} label="Total amount collected" href={`/app/airfare?${rng}`} />
        <Stat n={U.peso(air.income)} label="Agency income (SC − card fees)" tone={air.income >= 0 ? 'pos' : 'neg'} href={`/app/finance-monitor?${rng}`} />
      </Stats>
      <h2>Sales &amp; expenses</h2>
      <Stats>
        <Stat n={U.peso(f.booking_sales)} label="Total booking sales" href={`/app/finance?${rng}`} />
        <Stat n={U.peso(f.collected)} label="Payments collected (net of refunds)" href={`/app/finance?${rng}`} />
        <Stat n={U.peso(f.supplier_costs)} label="Supplier costs (confirmed)" href={`/app/finance?${rng}`} />
        <Stat n={U.peso(f.expenses)} label="Operating expenses" href={`/app/expenses?${rng}`} />
        <Stat n={U.peso(f.net)} label="Estimated net operating result" tone={f.net >= 0 ? 'pos' : 'neg'} href={`/app/finance?${rng}`} />
      </Stats>

      <h2>Employee monitoring <span className="muted small">(today)</span></h2>
      <Stats>
        <Stat n={emp.active} label="Active employees" href="/app/employees" />
        <Stat n={emp.timedIn} label="Recorded time-in today" href="/app/attendance-monitor" />
        <Stat n={emp.clockedIn} label="Currently clocked in" href="/app/attendance-monitor" />
        <Stat n={emp.late} label="Marked late today" tone={emp.late ? 'neg' : undefined} href="/app/attendance-monitor" />
        <Stat n={emp.absent} label="Absent today (after shift end)" tone={emp.absent ? 'neg' : undefined} href="/app/attendance-monitor" />
        <Stat n={emp.incomplete} label="Incomplete records (period)" tone={emp.incomplete ? 'neg' : undefined} href="/app/attendance-monitor" />
      </Stats>

      <OwnerCharts d={chart} />
      {clock}
    </Page>
  );
}
