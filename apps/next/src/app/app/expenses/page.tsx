import { requireUser, isOwner } from '@/lib/auth';
import { db } from '@/lib/db';
import { EXPENSE_CATS } from '@/lib/biz';
import { flat, paginate } from '@/lib/list';
import { longDate, intOrNull, today } from '@/lib/util';
import { expenseCats, expenseQuery } from '@/lib/queries/expenses';
import { Page, Pager } from '@/components/ui';
import { DateRangeFilter, TableFilters } from '@/components/list-filters';
import { ExpenseModalButton } from '@/components/expense-modal';
import { ExpensesTable, type ExpenseRow } from '@/components/expenses-table';
import { ReceiptPanel } from '@/components/receipt-viewer';
import { BatchUploadButton } from '@/components/batch-upload';
import { EXPENSE_COLS } from '@/lib/batch-cols';

export const metadata = { title: 'Expenses' };

// One Expenses page for the owner / admin (every staff member's expenses) and for staff (only their own). Same header, filters,
// table and Add Expense dialog on both sides; the list query itself enforces who sees what.
export default async function Expenses(props: PageProps<'/app/expenses'>) {
  const me = await requireUser('expenses');
  const q = flat(await props.searchParams);
  const owner = isOwner(me), td = today();
  const [sql, p] = expenseQuery(q, me);
  const [list, sums, recorders] = await Promise.all([
    paginate(q, sql, p, 25),
    db.get(`SELECT COUNT(*) AS n, COALESCE(SUM(x.amount),0) AS total FROM (${sql}) AS x`, p),
    owner ? db.all<{ id: number; name: string }>(`SELECT DISTINCT u.id, u.name FROM expenses e JOIN users u ON u.id=e.user_id WHERE e.status='Valid' ORDER BY u.name`) : Promise.resolve([]),
  ]);
  const rows: ExpenseRow[] = list.rows.map((r) => ({
    id: r.id, date: r.spent_at, type: r.category, description: r.description || '', method: r.method || '', amount: Number(r.amount),
    by: r.recorder || '', userId: r.user_id, receipt: r.receipt || '', receiptName: r.receipt_name || r.receipt || '',
  }));
  const cats = expenseCats(q), uid = owner ? intOrNull(q.uid) : null;
  const qs = new URLSearchParams(Object.entries({ q: q.q, category: cats.join(','), from: q.from, to: q.to, uid: uid ? String(uid) : '' }).filter(([, v]) => v) as [string, string][]).toString();
  const active = [(q.from || q.to) && `dates ${q.from ? longDate(q.from) : 'start'} to ${q.to ? longDate(q.to) : 'today'}`, cats.length && `types: ${cats.join(', ')}`,
    uid && `recorded by: ${recorders.find((r) => r.id === uid)?.name ?? uid}`, q.q && `search "${q.q}"`].filter(Boolean);
  const note = active.length ? `Filters are active (${active.join(', ')}). Only the filtered expenses will be exported.` : undefined;
  return (
    <Page title="Expenses" actions={<><BatchUploadButton title="Batch upload expenses" action="/api/expenses/batch" cols={EXPENSE_COLS} template="expenses-template.csv" /><ExpenseModalButton today={td} /></>} filters={
      <div className="af-bar"><DateRangeFilter today={td} showBy={false}
        initial={{ by: 'txn', from: q.from || '', to: q.to || '', range: q.range || (q.from || q.to ? 'custom' : '') }} /></div>
    }>
      <div className="tw-card">
        <TableFilters q={q.q || ''} placeholder="Search description, type or payment method" exportHref={`/api/expenses/export?${qs}`}
          exportTitle="Export the filtered expenses as CSV" exportNote={note} dropdowns={[
            { key: 'category', label: 'Type of expense', value: cats.join(','), options: [['', 'All types of expense'], ...EXPENSE_CATS], multiple: true, noun: 'types' },
            ...(owner ? [{ key: 'uid', label: 'Recorded by', value: uid ? String(uid) : '', options: [['', 'All staff'], ...recorders.map((r): [string, string] => [String(r.id), r.name])] as [string, string][] }] : []),
          ]} />
        <ExpensesTable rows={rows} total={Number(sums?.total ?? 0)} count={Number(sums?.n ?? 0)} today={td} owner={owner} meId={me.id} />
        {list.pages > 1 && <div className="tw-foot"><Pager list={list} /></div>}
      </div>
      <ReceiptPanel />
    </Page>
  );
}
