import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { download, get } from '../../../lib/api';
import { peso } from '../../../lib/format';
import { usePageTitle } from '../../../lib/title';
import PeriodFilter, { type Per } from './PeriodFilter';

interface F {
  booking_sales: number; quoted: number; confirmed: number; completed: number; cancelled: number; supplier_costs: number; fees: number;
  n_confirmed: number; n_completed: number; collected: number; received: number; refunds: number; expenses: number; outstanding: number;
  grossMargin: number; net: number;
}
interface FinanceData {
  per: Per; f: F;
  byService: { k: string; n: number; sales: number; cost: number; fees: number }[];
  expCat: { k: string; total: number }[];
  owing: { id: number; ref: string; customer: string; status: string; total: number; paid: number; balance: number }[];
}

const Tile = ({ n, l, tone }: { n: string; l: string; tone?: string }) => <div className={`stat ${tone ?? ''}`}><div className="n">{n}</div><div className="l">{l}</div></div>;

export default function Finance() {
  usePageTitle('Financial Reports');
  const [sp] = useSearchParams();
  const qs = sp.toString();
  const { data } = useQuery({ queryKey: ['finance', qs], queryFn: () => get<FinanceData>('/finance' + (qs ? `?${qs}` : '')) });
  if (!data) return <p className="muted">Loading…</p>;
  const { per, f, byService, expCat, owing } = data;
  const exportQs = `period=${per.key}&from=${per.from}&to=${per.to}&export=csv`;

  return (
    <>
      <PeriodFilter key={`${per.key}${per.from}${per.to}`} per={per}>
        <button type="button" className="btn ghost" onClick={() => download(`/finance?${exportQs}`, 'financial-report.csv')}>Export CSV</button>
        <button type="button" className="btn ghost" onClick={() => window.print()}>PDF / Print</button>
      </PeriodFilter>
      <p className="muted">Period: <strong>{per.from}</strong> to <strong>{per.to}</strong> · Currency: PHP · Time zone: Asia/Manila</p>

      <div className="stats">
        <Tile n={peso(f.booking_sales)} l="Total booking sales (quoted + confirmed + completed)" />
        <Tile n={peso(f.confirmed)} l={`Confirmed booking value (${f.n_confirmed + f.n_completed} bookings)`} />
        <Tile n={peso(f.collected)} l="Payments collected (net of refunds)" />
        <Tile n={peso(f.supplier_costs)} l="Supplier costs" />
        <Tile n={peso(f.fees)} l="Service fees & commissions" />
        <Tile n={peso(f.expenses)} l="Business expenses" />
        <Tile n={peso(f.outstanding)} l="Outstanding customer balances (as of today)" tone={f.outstanding ? 'neg' : ''} />
        <Tile n={peso(f.grossMargin)} l="Estimated gross booking margin" tone={f.grossMargin >= 0 ? 'pos' : 'neg'} />
        <Tile n={peso(f.net)} l="Estimated net operating result" tone={f.net >= 0 ? 'pos' : 'neg'} />
      </div>

      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card"><h3>Sales breakdown by booking status</h3><dl className="kv">
          <dt>Quoted (not yet confirmed)</dt><dd>{peso(f.quoted)}</dd>
          <dt>Confirmed + completed</dt><dd>{peso(f.confirmed)}</dd>
          <dt>of which Completed</dt><dd>{peso(f.completed)}</dd>
          <dt>Cancelled (excluded)</dt><dd>{peso(f.cancelled)}</dd>
        </dl></div>
        <div className="card"><h3>Collections</h3><dl className="kv">
          <dt>Payments received</dt><dd>{peso(f.received)}</dd>
          <dt>Refunds paid</dt><dd>−{peso(f.refunds)}</dd>
          <dt>Net collected</dt><dd><strong>{peso(f.collected)}</strong></dd>
        </dl>
          <p className="small muted">Money collected is not profit: a ₱15,000 payment for a ₱14,000 ticket yields ₱1,000 gross margin before expenses.</p></div>
      </div>

      <h3>By service (confirmed + completed)</h3>
      <div className="tw"><table><thead><tr><th>Service</th><th className="num">Bookings</th><th className="num">Sales</th><th className="num">Supplier cost</th><th className="num">Margin</th></tr></thead><tbody>
        {byService.map((s) => <tr key={s.k}><td>{s.k}</td><td className="num">{s.n}</td><td className="num">{peso(s.sales)}</td><td className="num">{peso(s.cost)}</td><td className="num">{peso(s.sales - s.cost)}</td></tr>)}
        {!byService.length && <tr><td colSpan={5} className="empty">No confirmed bookings in this period.</td></tr>}
      </tbody></table></div>

      <h3 style={{ marginTop: 20 }}>Expenses by category</h3>
      <div className="tw"><table><thead><tr><th>Category</th><th className="num">Total</th></tr></thead><tbody>
        {expCat.map((s) => <tr key={s.k}><td>{s.k}</td><td className="num">{peso(s.total)}</td></tr>)}
        {!expCat.length && <tr><td colSpan={2} className="empty">No expenses in this period.</td></tr>}
      </tbody></table></div>

      <h3 style={{ marginTop: 20 }}>Largest outstanding balances</h3>
      <div className="tw"><table><thead><tr><th>Booking</th><th>Customer</th><th>Status</th><th className="num">Total</th><th className="num">Paid</th><th className="num">Balance</th></tr></thead><tbody>
        {owing.map((b) => (
          <tr key={b.id}><td><Link to={`/app/bookings/${b.id}`}>{b.ref}</Link></td><td>{b.customer}</td><td>{b.status}</td>
            <td className="num">{peso(b.total)}</td><td className="num">{peso(b.paid)}</td><td className="num">{peso(b.balance)}</td></tr>
        ))}
        {!owing.length && <tr><td colSpan={6} className="empty">Nothing outstanding.</td></tr>}
      </tbody></table></div>

      <div className="card" style={{ marginTop: 20 }}><h3>Accounting assumptions</h3><ul className="small">
        <li>Booking sales are by booking creation date; cancelled bookings are excluded from sales, margin and balances.</li>
        <li>Confirmed value = bookings with status Confirmed or Completed. Supplier costs, fees and margin are recognised only on confirmed value.</li>
        <li>Collections are on a cash basis by payment date: valid payments minus valid refunds. Reversed records are ignored.</li>
        <li>Gross booking margin = confirmed value − supplier costs. Net operating result = gross margin − valid business expenses (voided expenses excluded).</li>
        <li>Outstanding balance = total payable − net payments on Confirmed/Completed bookings, regardless of the period filter.</li>
      </ul></div>
    </>
  );
}
