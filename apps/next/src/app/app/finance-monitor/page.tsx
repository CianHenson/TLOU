import { requireUser } from '@/lib/auth';
import { EXPENSE_CATS } from '@/lib/biz';
import { flat } from '@/lib/list';
import { longDate, today } from '@/lib/util';
import { financeRange, financeSheet } from '@/lib/queries/finance-monitor';
import { Page } from '@/components/ui';
import { DateRangeFilter, TableFilters } from '@/components/list-filters';
import { ExpenseModalButton } from '@/components/expense-modal';
import { FinanceTable } from '@/components/finance-table';
import { ReceiptPanel } from '@/components/receipt-viewer';
import { BatchUploadButton } from '@/components/batch-upload';
import { EXPENSE_COLS } from '@/lib/batch-cols';

export const metadata = { title: 'Finance Monitoring' };

export default async function FinanceMonitor(props: PageProps<'/app/finance-monitor'>) {
  await requireUser('owner');
  const q = flat(await props.searchParams);
  const f = financeRange(q);
  const { rows, total } = await financeSheet(f);
  const qs = new URLSearchParams(Object.entries({ from: f.from, to: f.to, q: f.search, category: f.categories.join(',') }).filter(([, v]) => v)).toString();
  const td = today();
  const active = [f.range === 'all' ? '' : `dates ${longDate(f.from)} to ${longDate(f.to)}`, f.categories.length && `types: ${f.categories.join(', ')}`, f.search && `search "${f.search}"`].filter(Boolean);
  const note = active.length ? `Filters are active (${active.join(', ')}). Only the filtered expenses will be exported.` : undefined;
  return (
    <Page title="Monitoring Finances" actions={<><BatchUploadButton title="Batch upload expenses" action="/api/expenses/batch" cols={EXPENSE_COLS} template="expenses-template.csv" /><ExpenseModalButton today={td} /></>} filters={
      <div className="af-bar"><DateRangeFilter today={td} showBy={false} allValue="all"
        initial={{ by: 'txn', from: f.range === 'all' ? '' : f.from, to: f.range === 'all' ? '' : f.to, range: f.range }} /></div>
    }>
      <div className="tw-card">
        <TableFilters q={f.search} placeholder="Search expense descriptions" exportHref={`/api/finance-monitor/export?${qs}`} exportTitle="Export the filtered expenses as CSV" exportNote={note} dropdowns={[
          { key: 'category', label: 'Type of expense', value: f.categories.join(','), options: [['', 'All types of expense'], ...EXPENSE_CATS], multiple: true, noun: 'types' },
        ]} />
        <FinanceTable today={td} rows={rows} total={total} />
      </div>
      <ReceiptPanel />
    </Page>
  );
}
