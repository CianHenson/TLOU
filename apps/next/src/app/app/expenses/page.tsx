import { requireUser, isOwner } from '@/lib/auth';
import { db } from '@/lib/db';
import { EXPENSE_CATS, METHODS } from '@/lib/biz';
import { flat, paginate } from '@/lib/list';
import { peso, today } from '@/lib/util';
import { Page, Pager } from '@/components/ui';
import { ApiForm, Field, Submit } from '@/components/form';
import { expenseQuery } from '@/lib/queries/expenses';

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
  return (
    <Page title="Expenses" filters={
      <form className="filters" method="get" key={list.qs}>
          <div className="grow"><label>Search</label><input name="q" defaultValue={q.q || ''} /></div>
          <div><label>Category</label><select name="category" defaultValue={q.category || ''}><option value="">All</option>{EXPENSE_CATS.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div><label>From</label><input type="date" name="from" defaultValue={q.from || ''} /></div><div><label>To</label><input type="date" name="to" defaultValue={q.to || ''} /></div>
          <div className="btnrow"><button className="btn">Filter</button><a className="btn ghost" href={`/api/expenses/export?${list.qs}`}>Export CSV</a></div>
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
      <p><strong>Total (valid) for this filter: {peso(total)}</strong></p>
      <div className="tw"><table><thead><tr><th>Date</th><th>Category</th><th>Description</th><th>Method</th><th className="num">Amount</th><th>By</th><th>Receipt</th><th></th></tr></thead><tbody>
        {list.rows.map((e) => (
          <tr key={e.id} className={e.status === 'Voided' ? 'off' : ''}><td className="nowrap">{e.spent_at}</td><td>{e.category}</td><td>{e.description}{e.status === 'Voided' ? ' — VOIDED: ' + e.void_reason : ''}</td><td>{e.method}</td><td className="num">{peso(e.amount)}</td><td>{e.recorder}</td>
            <td>{e.receipt && <a href={`/api/files/receipt/${e.id}`}>View</a>}</td>
            <td>{owner && e.status === 'Valid' && (
              <ApiForm action={`/api/expenses/${e.id}/void`} className="row">
                <input name="reason" placeholder="Reason" required style={{ width: 110 }} />
                <Submit className="btn danger sm" confirm="Void this expense?">Void</Submit>
              </ApiForm>
            )}</td></tr>
        ))}
        {!list.rows.length && <tr><td colSpan={8} className="empty">No expenses recorded.</td></tr>}
      </tbody></table></div>
      <Pager list={list} />
    </Page>
  );
}
