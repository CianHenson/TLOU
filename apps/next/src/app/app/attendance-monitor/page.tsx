import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import * as U from '@/lib/util';
import { flat } from '@/lib/list';
import { ATT_STATUSES } from '@/lib/types';
import { activeEmployees, allEmployees, attendanceRecords, availableUsers, leaveRequests, payrollList, recordRange, workSummary } from '@/lib/queries/payroll';
import { Page, Pager } from '@/components/ui';
import { HolidaysButton } from '@/components/att-holidays';
import { DateRangeFilter, TableFilters } from '@/components/list-filters';
import { AttendanceTable } from '@/components/att-records';
import { AddEmployeeButton, EmployeeTable } from '@/components/att-employees';
import { RequestsButton } from '@/components/att-requests';
import { GeneratePayrollButton, PayrollTable } from '@/components/att-payroll';
import { SectionSelect } from '@/components/att-section';

export const metadata = { title: 'Attendance Monitoring & Payroll' };

const TABS = ['attendance', 'employees', 'payroll'];
const PER_PAGE = 50;

export default async function AttendanceMonitor(props: PageProps<'/app/attendance-monitor'>) {
  await requireUser('owner');
  const q = flat(await props.searchParams);
  const tab = TABS.includes(q.tab) ? q.tab : 'attendance';
  const td = U.today();
  const [mFrom, mTo] = U.monthRange(td.slice(0, 7));
  const [requests, all, staff, leaves] = await Promise.all([
    leaveRequests(), allEmployees(), activeEmployees(),
    db.all(`SELECT l.*, u.name FROM leaves l LEFT JOIN users u ON u.id=l.user_id WHERE l.day>=? AND l.request_id IS NULL ORDER BY l.day LIMIT 50`, [U.addDays(td, -30)]),
  ]);
  const uid = U.intOrNull(q.uid);
  const empOpts: [string, string][] = [['', 'All employees'], ...all.map((e): [string, string] => [String(e.id), e.active ? e.name : `${e.name} (deactivated)`])];
  const monthLabel = new Date(td + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });

  let filters: React.ReactNode = null, actions: React.ReactNode = null, body: React.ReactNode;
  if (tab === 'attendance') {
    const r = recordRange(q);
    const statuses = (q.status || '').split(',').filter((s) => ATT_STATUSES.includes(s));
    const search = U.str(q.q, 60).toLowerCase();
    const rows = (await attendanceRecords({ ...r, uid, statuses })).filter((x) => !search || String(x.name).toLowerCase().includes(search));
    const pages = Math.max(1, Math.ceil(rows.length / PER_PAGE)), page = Math.min(pages, Math.max(1, parseInt(q.page, 10) || 1));
    const qs = new URLSearchParams(Object.entries(q).filter(([k, v]) => v && k !== 'page')).toString();
    const active = [`dates ${U.longDate(r.from)} to ${U.longDate(r.to)}`, uid && `employee: ${all.find((e) => e.id === uid)?.name ?? uid}`, statuses.length && `status: ${statuses.join(', ')}`, search && `search "${q.q}"`].filter(Boolean);
    filters = <div className="af-bar"><DateRangeFilter today={td} showBy={false} allowAll={false} initial={{ by: 'txn', from: r.from, to: r.to, range: r.range }} /></div>;
    body = (
      <>
        <div className="tw-card">
          <TableFilters lead={<SectionSelect value="attendance" />} q={q.q || ''} placeholder="Search employee name" exportHref={`/api/attendance-monitor/export?${qs}`} exportTitle="Export the filtered records as CSV"
            exportNote={`Only the filtered records will be exported (${active.join(', ')}).`} dropdowns={[
              { key: 'uid', label: 'Employee', value: uid ? String(uid) : '', options: empOpts },
              { key: 'status', label: 'Status', value: statuses.join(','), options: [['', 'All statuses'], ...ATT_STATUSES], multiple: true, noun: 'statuses' },
            ]} />
          <AttendanceTable rows={rows.slice((page - 1) * PER_PAGE, page * PER_PAGE)} totalMins={rows.reduce((a, x) => a + x.mins, 0)} totalCount={rows.length} />
          {pages > 1 && <div className="tw-foot"><Pager list={{ page, pages, total: rows.length, qs }} /></div>}
        </div>
      </>
    );
  } else if (tab === 'employees') {
    const search = U.str(q.q, 60).toLowerCase();
    const [users, rows] = await Promise.all([
      availableUsers(),
      Promise.all(all.filter((e) => !search || `${e.name} ${e.username} ${e.designation ?? ''}`.toLowerCase().includes(search))
        .map(async (e) => ({ ...e, ...(await workSummary(e, mFrom, td)) }))),
    ]);
    actions = <AddEmployeeButton users={users} />;
    body = (
      <>
        <div className="tw-card"><TableFilters lead={<SectionSelect value="employees" />} q={q.q || ''} placeholder="Search employee name" dropdowns={[]} /><EmployeeTable rows={rows} monthLabel={monthLabel} month={[mFrom, mTo]} searching={!!search} /></div>
      </>
    );
  } else {
    const from = U.isDate(q.from) ? q.from : '', to = U.isDate(q.to) ? q.to : '';
    const search = U.str(q.q, 60).toLowerCase();
    const rows = (await payrollList({ uid, from, to })).filter((x) => !search || String(x.name).toLowerCase().includes(search));
    actions = <GeneratePayrollButton employees={staff} today={td} />;
    filters = <div className="af-bar"><DateRangeFilter today={td} showBy={false} initial={{ by: 'txn', from, to, range: q.range || (from || to ? 'custom' : '') }} /></div>;
    body = (
      <>
        <div className="tw-card">
          <TableFilters lead={<SectionSelect value="payroll" />} q={q.q || ''} placeholder="Search employee name" dropdowns={[{ key: 'uid', label: 'Employee', value: uid ? String(uid) : '', options: empOpts }]} />
          <PayrollTable rows={rows} />
        </div>
      </>
    );
  }

  return (
    <Page title="Attendance Monitoring & Payroll" filters={filters} actions={<><HolidaysButton rows={leaves} staff={staff} /><RequestsButton rows={requests} />{actions}</>}>
      {body}
    </Page>
  );
}
