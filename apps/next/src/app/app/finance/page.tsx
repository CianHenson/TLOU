import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import * as B from '@/lib/biz';
import * as U from '@/lib/util';
import { flat } from '@/lib/list';
import { financeDetail, period } from '@/lib/queries/owner';
import { airfareSummary } from '@/lib/queries/airfare';
import { Page, Stat, Stats } from '@/components/ui';
import { PeriodFilter } from '@/components/owner-bits';

export const metadata = { title: 'Sales' };

export default async function Finance(props: PageProps<'/app/finance'>) {
  await requireUser('owner');
  const per = period(flat(await props.searchParams));
  const f = await B.finance(per.from, per.to);
  const [{ byService, expCat, owing }, air] = await Promise.all([financeDetail(per.from, per.to), airfareSummary(per.from, per.to)]);
  const peso = U.peso;
  const rng = `from=${per.from}&to=${per.to}`;
  return (
    <Page title="Sales" filters={
      <PeriodFilter per={per} exportHref={`/api/finance/export?period=${per.key}&from=${per.from}&to=${per.to}`} />
    }>
      <p className="muted">Period: <strong>{per.from}</strong> to <strong>{per.to}</strong> · Currency: PHP · Time zone: Asia/Manila</p>

      <h2>Airfare sales</h2>
      <Stats>
        <Stat n={air.n} label="Sales (excl. cancelled)" href={`/app/airfare?${rng}`} />
        <Stat n={air.pax} label="Passengers (PAX)" href={`/app/airfare?${rng}`} />
        <Stat n={peso(air.total)} label="Total amount collected" href={`/app/airfare?${rng}`} />
        <Stat n={peso(air.sc)} label="Service charges" href={`/app/airfare?${rng}`} />
        <Stat n={peso(air.income)} label="Agency income (SC − card fees)" tone={air.income >= 0 ? 'pos' : 'neg'} href={`/app/airfare?${rng}`} />
      </Stats>

      <h2>Bookings</h2>

      <div className="stats">
        <div className="stat"><div className="n">{peso(f.booking_sales)}</div><div className="l">Total booking sales (quoted + confirmed + completed)</div></div>
        <div className="stat"><div className="n">{peso(f.confirmed)}</div><div className="l">Confirmed booking value ({f.n_confirmed + f.n_completed} bookings)</div></div>
        <div className="stat"><div className="n">{peso(f.collected)}</div><div className="l">Payments collected (net of refunds)</div></div>
        <div className="stat"><div className="n">{peso(f.supplier_costs)}</div><div className="l">Supplier costs</div></div>
        <div className="stat"><div className="n">{peso(f.fees)}</div><div className="l">Service fees &amp; commissions</div></div>
        <div className="stat"><div className="n">{peso(f.expenses)}</div><div className="l">Business expenses</div></div>
        <div className={`stat ${f.outstanding ? 'neg' : ''}`}><div className="n">{peso(f.outstanding)}</div><div className="l">Outstanding customer balances (as of today)</div></div>
        <div className={`stat ${f.grossMargin >= 0 ? 'pos' : 'neg'}`}><div className="n">{peso(f.grossMargin)}</div><div className="l">Estimated gross booking margin</div></div>
        <div className={`stat ${f.net >= 0 ? 'pos' : 'neg'}`}><div className="n">{peso(f.net)}</div><div className="l">Estimated net operating result</div></div>
      </div>

      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card"><h3>Sales breakdown by booking status</h3><dl className="kv">
          <dt>Quoted (not yet confirmed)</dt><dd>{peso(f.quoted)}</dd><dt>Confirmed + completed</dt><dd>{peso(f.confirmed)}</dd><dt>of which Completed</dt><dd>{peso(f.completed)}</dd><dt>Cancelled (excluded)</dt><dd>{peso(f.cancelled)}</dd></dl></div>
        <div className="card"><h3>Collections</h3><dl className="kv"><dt>Payments received</dt><dd>{peso(f.received)}</dd><dt>Refunds paid</dt><dd>−{peso(f.refunds)}</dd><dt>Net collected</dt><dd><strong>{peso(f.collected)}</strong></dd></dl>
          <p className="small muted">Money collected is not profit: a ₱15,000 payment for a ₱14,000 ticket yields ₱1,000 gross margin before expenses.</p></div>
      </div>
      <h3>By service (confirmed + completed)</h3>
      <div className="tw"><table><thead><tr><th>Service</th><th className="num">Bookings</th><th className="num">Sales</th><th className="num">Supplier cost</th><th className="num">Margin</th></tr></thead><tbody>
        {byService.map((s) => <tr key={s.k}><td>{s.k}</td><td className="num">{s.n}</td><td className="num">{peso(s.sales)}</td><td className="num">{peso(s.cost)}</td><td className="num">{peso(s.sales - s.cost)}</td></tr>)}
        {!byService.length && <tr><td colSpan={5} className="empty">No confirmed bookings in this period.</td></tr>}</tbody></table></div>
      <h3 style={{ marginTop: 20 }}>Expenses by category</h3>
      <div className="tw"><table><thead><tr><th>Category</th><th className="num">Total</th></tr></thead><tbody>
        {expCat.map((s) => <tr key={s.k}><td>{s.k}</td><td className="num">{peso(s.total)}</td></tr>)}
        {!expCat.length && <tr><td colSpan={2} className="empty">No expenses in this period.</td></tr>}</tbody></table></div>
      <h3 style={{ marginTop: 20 }}>Largest outstanding balances</h3>
      <div className="tw"><table><thead><tr><th>Booking</th><th>Customer</th><th>Status</th><th className="num">Total</th><th className="num">Paid</th><th className="num">Balance</th></tr></thead><tbody>
        {owing.map((b) => <tr key={b.id}><td><Link href={`/app/bookings/${b.id}`}>{b.ref}</Link></td><td>{b.customer}</td><td>{b.status}</td><td className="num">{peso(b.total)}</td><td className="num">{peso(b.paid)}</td><td className="num">{peso(b.balance)}</td></tr>)}
        {!owing.length && <tr><td colSpan={6} className="empty">Nothing outstanding.</td></tr>}</tbody></table></div>

      <div className="card" style={{ marginTop: 20 }}><h3>Accounting assumptions</h3><ul className="small">
        <li>Booking sales are by booking creation date; cancelled bookings are excluded from sales, margin and balances.</li>
        <li>Confirmed value = bookings with status Confirmed or Completed. Supplier costs, fees and margin are recognised only on confirmed value.</li>
        <li>Collections are on a cash basis by payment date: valid payments minus valid refunds. Reversed records are ignored.</li>
        <li>Gross booking margin = confirmed value − supplier costs. Net operating result = gross margin − valid business expenses (voided expenses excluded).</li>
        <li>Outstanding balance = total payable − net payments on Confirmed/Completed bookings, regardless of the period filter.</li></ul></div>
    </Page>
  );
}
