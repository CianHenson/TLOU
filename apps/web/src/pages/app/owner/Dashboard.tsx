import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { get } from '../../../lib/api';
import { dateTime, peso } from '../../../lib/format';
import { usePageTitle } from '../../../lib/title';
import Stat, { Stats } from '../../../ui/Stat';
import Charts, { type ChartData } from './Charts';
import ClockCard, { type Clock } from './ClockCard';
import PeriodFilter, { type Per } from './PeriodFilter';

interface Counts { pending: number; open_requests: number; confirmed: number; completed: number; customers: number; messages: number }
interface Finance {
  booking_sales: number; collected: number; outstanding: number; supplier_costs: number; expenses: number; net: number;
}
interface OwnerDash {
  role: 'owner'; per: Per; f: Finance; counts: Counts; newInq: number; clock: Clock; chart: ChartData;
  emp: { active: number; timedIn: number; clockedIn: number; late: number; absent: number; incomplete: number };
}
interface StaffDash {
  role: 'employee'; counts: Counts; clock: Clock;
  mine: { id: number; ref: string; status: string; service_type: string; customer: string }[];
  newest: { id: number; ref: string; service_type: string; created_at: string; customer: string }[];
}

// One route for everyone: the API returns the owner or the employee dashboard depending on the role.
export default function Dashboard() {
  usePageTitle('Dashboard');
  const [sp] = useSearchParams();
  const qs = sp.toString();
  const { data } = useQuery({ queryKey: ['dashboard', qs], queryFn: () => get<OwnerDash | StaffDash>('/dashboard' + (qs ? `?${qs}` : '')) });
  if (!data) return <p className="muted">Loading…</p>;
  return data.role === 'owner' ? <OwnerView d={data} /> : <StaffView d={data} />;
}

function OwnerView({ d }: { d: OwnerDash }) {
  const { per, f, counts, emp } = d;
  const rng = `from=${per.from}&to=${per.to}`;
  return (
    <>
      <PeriodFilter key={`${per.key}${per.from}${per.to}`} per={per} hint />

      <h2>Business performance</h2>
      <Stats>
        <Stat n={counts.customers} label="Total customers" to="/app/customers" />
        <Stat n={d.newInq} label="New inquiries (period)" to={`/app/requests?${rng}`} />
        <Stat n={counts.pending} label="Pending requests" to="/app/requests?status=Pending+Review" />
        <Stat n={counts.confirmed} label="Confirmed bookings" to="/app/bookings?status=Confirmed" />
        <Stat n={counts.completed} label="Completed bookings" to="/app/bookings?status=Completed" />
        <Stat n={peso(f.booking_sales)} label="Total booking sales" to={`/app/bookings?${rng}`} />
        <Stat n={peso(f.collected)} label="Payments collected (net of refunds)" to={`/app/payments?${rng}`} />
        <Stat n={peso(f.outstanding)} label="Outstanding balances (all time)" tone={f.outstanding ? 'neg' : undefined} to="/app/customers?owing=1" />
        <Stat n={peso(f.supplier_costs)} label="Supplier costs (confirmed)" to={`/app/finance?${rng}`} />
        <Stat n={peso(f.expenses)} label="Operating expenses" to={`/app/expenses?${rng}`} />
        <Stat n={peso(f.net)} label="Estimated net operating result" tone={f.net >= 0 ? 'pos' : 'neg'} to={`/app/finance?${rng}`} />
        <Stat n={counts.messages} label="Unhandled contact messages" to="/app/settings" />
      </Stats>

      <h2>Employee monitoring <span className="muted small">(today)</span></h2>
      <Stats>
        <Stat n={emp.active} label="Active employees" to="/app/employees" />
        <Stat n={emp.timedIn} label="Recorded time-in today" to="/app/attendance-monitor" />
        <Stat n={emp.clockedIn} label="Currently clocked in" to="/app/attendance-monitor" />
        <Stat n={emp.late} label="Marked late today" tone={emp.late ? 'neg' : undefined} to="/app/attendance-monitor" />
        <Stat n={emp.absent} label="Absent today (after shift end)" tone={emp.absent ? 'neg' : undefined} to="/app/attendance-monitor" />
        <Stat n={emp.incomplete} label="Incomplete records (period)" tone={emp.incomplete ? 'neg' : undefined} to="/app/attendance-report" />
      </Stats>

      <Charts d={d.chart} />
      <ClockCard clock={d.clock} />
    </>
  );
}

function StaffView({ d }: { d: StaffDash }) {
  const { counts } = d;
  return (
    <>
      <ClockCard clock={d.clock} />
      <Stats>
        <Stat n={counts.pending} label="Pending requests" to="/app/requests?status=Pending+Review" />
        <Stat n={counts.open_requests} label="Open requests" to="/app/requests?status=open" />
        <Stat n={counts.confirmed} label="Confirmed bookings" to="/app/bookings?status=Confirmed" />
        <Stat n={counts.customers} label="Customers" to="/app/customers" />
      </Stats>
      <div className="grid g2">
        <div className="card"><h3>New requests awaiting review</h3>
          {!d.newest.length && <p className="muted">Nothing pending. 🎉</p>}
          <ul className="timeline">{d.newest.map((r) => (
            <li key={r.id}><Link to={`/app/requests/${r.id}`}>{r.ref}</Link> · {r.customer}
              <div className="small muted">{r.service_type} · {dateTime(r.created_at)}</div></li>
          ))}</ul>
        </div>
        <div className="card"><h3>My open requests</h3>
          {!d.mine.length && <p className="muted">No open requests assigned to you.</p>}
          <ul className="timeline">{d.mine.map((r) => (
            <li key={r.id}><Link to={`/app/requests/${r.id}`}>{r.ref}</Link> · {r.customer} <span className="badge">{r.status}</span></li>
          ))}</ul>
        </div>
      </div>
      <div className="row">
        <Link className="btn" to="/app/requests/new">Register a walk-in / phone request</Link>{' '}
        <Link className="btn ghost" to="/app/customers/new">New customer</Link>{' '}
        <Link className="btn ghost" to="/app/bookings/new">New booking</Link>
      </div>
    </>
  );
}
