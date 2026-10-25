import { requireUser } from '@/lib/auth';
import { EXPENSE_CATS } from '@/lib/biz';
import { flat } from '@/lib/list';
import { peso, today } from '@/lib/util';
import { financeRange, financeSheet } from '@/lib/queries/finance-monitor';
import { Page } from '@/components/ui';
import { DateRangeFilter, TableFilters } from '@/components/list-filters';
import { ExpenseModalButton } from '@/components/expense-modal';

export const metadata = { title: 'Finance Monitoring' };

const cell = (c: number) => (c ? peso(c) : <span className="muted">—</span>);

export default async function FinanceMonitor(props: PageProps<'/app/finance-monitor'>) {
  await requireUser('owner');
  const q = flat(await props.searchParams);
  const f = financeRange(q);
  const { rows, totals } = await financeSheet(f);
  const qs = new URLSearchParams(Object.entries({ from: f.from, to: f.to, rows: f.rows, q: f.search, category: f.category }).filter(([, v]) => v)).toString();
  const td = today();
  return (
    <Page title="Monitoring Finances" actions={<ExpenseModalButton today={td} />} filters={
      <div className="af-bar"><DateRangeFilter today={td} showBy={false} allValue="all"
        initial={{ by: 'txn', from: f.range === 'all' ? '' : f.from, to: f.range === 'all' ? '' : f.to, range: f.range }} /></div>
    }>
      <div className="tw-card">
        <TableFilters q={f.search} placeholder="Search expense descriptions" exportHref={`/api/finance-monitor/export?${qs}`} exportTitle="Export this sheet as CSV" dropdowns={[
          { key: 'category', label: 'Category', value: f.category, options: [['', 'All categories'], ...EXPENSE_CATS] },
          { key: 'rows', label: 'One row per', value: f.rows === 'month' ? 'month' : '', options: [['', 'One row per day'], ['month', 'One row per month']] },
        ]} />
        <div className="tw tw-fixed"><table><thead><tr><th>{f.rows === 'month' ? 'Month' : 'Date'}</th>{EXPENSE_CATS.map((c) => <th key={c} className="num">{c}</th>)}<th className="num">Total cost</th></tr></thead><tbody>
          {rows.map((r) => (
            <tr key={r.key}><td className="nowrap">{r.key}</td>{r.cats.map((c, i) => <td key={i} className="num">{cell(c)}</td>)}<td className="num"><strong>{peso(r.total)}</strong></td></tr>
          ))}
          {!rows.length && <tr><td colSpan={EXPENSE_CATS.length + 2} className="empty">No expenses recorded for these dates.</td></tr>}
        </tbody>
          {!!rows.length && <tfoot><tr><td>Total</td>{totals.cats.map((c, i) => <td key={i} className="num">{peso(c)}</td>)}<td className="num">{peso(totals.total)}</td></tr></tfoot>}
        </table></div>
      </div>
      <p className="muted small">Built from recorded expenses (voided ones excluded). Expenses under older categories count as Miscellaneous.</p>
    </Page>
  );
}
