import { requireUser, isOwner } from '@/lib/auth';
import { db } from '@/lib/db';
import { EXPENSE_CATS, METHODS } from '@/lib/biz';
import { flat, paginate } from '@/lib/list';
import { peso, today } from '@/lib/util';
import { FootLine, Page, Pager } from '@/components/ui';
import { ApiForm, Field, Submit } from '@/components/form';
import { ExportLink } from '@/components/widgets';
import { ReceiptLink, ReceiptPanel } from '@/components/receipt-viewer';
import { expenseQuery } from '@/lib/queries/expenses';
import { rowMenu } from '@/lib/menu';
import { RowMenus } from '@/components/context-menu';

export const metadata = { title: 'Expenses' };

export default async function Expenses(props: PageProps<'/app/expenses'>) {
  const me = await requireUser('expenses');
  const q = flat(await props.searchParams);
  const [sql, p] = expenseQuery(q);
  const [list, total] = await Promise.all([
    paginate(q, sql, p),
    db.val(`SELECT COALESCE(SUM(x.amount),0) FROM (${sql}) AS x WHERE x.status='Valid'`, p),
  ]);
  const owner = isOwner(me), td = today();
  const active = [EXPENSE_CATS.includes(q.category) && `category: ${q.category}`, (q.from || q.to) && `dates ${q.from || 'start'} to ${q.to || 'today'}`, q.q && `search "${q.q}"`].filter(Boolean);
  const note = active.length ? `Filters are active (${active.join(', ')}). Only the filtered expenses will be exported.` : undefined;
  return (
    <Page title="Expenses" filters={
      <form className="filters" method="get" key={list.qs}>
          <div className="grow"><label>Search</label><input name="q" defaultValue={q.q || ''} /></div>
          <div><label>Category</label><select name="category" defaultValue={q.category || ''}><option value="">All</option>{EXPENSE_CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label>From</label><input type="date" name="from" defaultValue={q.from || ''} /></div><div><label>To</label><input type="date" name="to" defaultValue={q.to || ''} /></div>
          <div className="btnrow"><button className="btn">Filter</button><ExportLink href={`/api/expenses/export?${list.qs}`} note={note}>Export CSV</ExportLink></div>
        </form>
    }>
      <ApiForm action="/api/expenses" reset className="card">
        <h3>Record an expense</h3>
        <div className="grid g4">
          <Field name="spent_at" label="Date *" type="date" defaultValue={td} attrs={{ max: td, required: true }} />
          <Field name="category" label="Category *" type="select" options={EXPENSE_CATS} emptyLabel={null} attrs={{ required: true }} />
          <Field name="amount" label="Amount (₱) *" type="number" attrs={{ step: '0.01', min: 0.01, required: true }} />
          <Field name="method" label="Payment method *" type="select" options={METHODS} emptyLabel={null} attrs={{ required: true }} />
        </div>
        <div className="grid g2">
          <Field name="description" label="Description *" attrs={{ maxLength: 500, required: true }} />
          <div className="field"><label htmlFor="f-receipt">Receipt (PDF/JPG/PNG, max 5 MB)</label><input id="f-receipt" type="file" name="receipt" accept=".pdf,.jpg,.jpeg,.png" /></div>
        </div>
        <Submit>Save expense</Submit>
      </ApiForm>
      <div className="tw-card"><RowMenus className="tw tw-fixed tw-fm"><table><colgroup><col /><col /><col style={{ width: '24%' }} /><col /><col /><col /><col /><col style={{ width: '20%' }} /></colgroup><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Method</th><th className="num">Amount</th><th>By</th><th>Receipt</th><th></th></tr></thead><tbody>
        {list.rows.map((e) => (
          <tr key={e.id} className={e.status === 'Voided' ? 'off' : ''} {...rowMenu([
            e.receipt && { label: 'View receipt', event: 'receipt:open', detail: { id: e.id, label: e.receipt, kind: String(e.receipt).toLowerCase().endsWith('.pdf') ? 'pdf' : 'img' } },
            owner && e.status === 'Valid' && { label: 'Void expense', reason: `/api/expenses/${e.id}/void`, title: `Void expense — ${e.description}`, danger: true }])}><td className="nowrap">{e.spent_at}</td><td>{e.category}</td><td>{e.description}{e.status === 'Voided' ? ' — VOIDED: ' + e.void_reason : ''}</td><td>{e.method}</td><td className="num">{peso(e.amount)}</td><td>{e.recorder}</td>
            <td>{e.receipt && <ReceiptLink id={e.id} label={e.receipt} kind={String(e.receipt).toLowerCase().endsWith('.pdf') ? 'pdf' : 'img'} />}</td>
            <td>{owner && e.status === 'Valid' && (
              <ApiForm action={`/api/expenses/${e.id}/void`} className="row">
                <input name="reason" placeholder="Reason" required style={{ width: 110 }} />
                <Submit className="btn danger sm" confirm="Void this expense?">Void</Submit>
              </ApiForm>
            )}</td></tr>
        ))}
        {!list.rows.length && <tr><td colSpan={8} className="empty">No expenses recorded.</td></tr>}
        {!!list.rows.length && <tr className="fill"><td colSpan={8} /></tr>}
      </tbody>
      {!!list.rows.length && <FootLine cols={8} total={list.total} right={`Total (valid): ${peso(total)}`} />}
      </table></RowMenus>
      {list.pages > 1 && <div className="tw-foot"><Pager list={list} /></div>}</div>
      <ReceiptPanel />
    </Page>
  );
}
