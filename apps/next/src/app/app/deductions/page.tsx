import { requireUser } from '@/lib/auth';
import { flat, paginate } from '@/lib/list';
import { today } from '@/lib/util';
import { deductionHistory, deductionQuery } from '@/lib/queries/deductions';
import { Page, Pager } from '@/components/ui';
import { TableFilters } from '@/components/list-filters';
import { AddDeductionButton, DeductionTable, HistoryButton, type DeductionItem, type HistoryItem } from '@/components/deductions';

export const metadata = { title: 'Payroll Deductions' };

export default async function Deductions(props: PageProps<'/app/deductions'>) {
  await requireUser('owner');
  const q = flat(await props.searchParams);
  const [sql, p] = deductionQuery(q);
  const [list, history] = await Promise.all([paginate(q, sql, p, 25), deductionHistory()]);
  const td = today();
  return (
    <Page title="Payroll Deductions" actions={<><HistoryButton rows={history as unknown as HistoryItem[]} /><AddDeductionButton today={td} /></>}>
      <p className="small muted" style={{ margin: '0 0 12px' }}>
        Set up the government and payroll deductions here. Only <strong>active</strong> deductions are applied to newly generated payroll, each shown separately on the payslip as
        gross salary × percentage. No rates are assumed: enter and verify the rates and basis that apply to your company. Payroll that was already generated is never changed.
      </p>
      <div className="tw-card">
        <TableFilters q={q.q || ''} placeholder="Search deduction name" dropdowns={[
          { key: 'status', label: 'Status', value: q.status || '', options: [['', 'All statuses'], ['active', 'Active'], ['inactive', 'Inactive']] },
        ]} />
        <DeductionTable rows={list.rows as unknown as DeductionItem[]} total={list.total} today={td} />
        {list.pages > 1 && <div className="tw-foot"><Pager list={list} /></div>}
      </div>
    </Page>
  );
}
