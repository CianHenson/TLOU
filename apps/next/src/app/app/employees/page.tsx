import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { flat } from '@/lib/list';
import { employeeFilters, employeeQuery, roleLabels } from '@/lib/queries/employees';
import { Page } from '@/components/ui';
import { TableFilters } from '@/components/list-filters';
import { UserTable } from '@/components/user-table';
import { NewUserButton } from '@/components/employee-edit-modal';

export const metadata = { title: 'User Management' };

export default async function Employees(props: PageProps<'/app/employees'>) {
  const me = await requireUser('owner');
  const meIsOwner = me.role === 'owner';
  const f = employeeFilters(flat(await props.searchParams), meIsOwner);
  const [sql, p] = employeeQuery(f);
  const users = await db.all(sql, p);
  return (
    <Page title="User Management" actions={<NewUserButton />}>
      <div className="tw-card">
        <TableFilters q={f.search} placeholder="Search name, username, employee no., designation" dropdowns={[
          { key: 'role', label: 'Role', value: f.roles.join(','), options: [['', 'All roles'], ...roleLabels(meIsOwner)], multiple: true, noun: 'roles' },
        ]} />
        <UserTable rows={users} me={me.id} meIsOwner={meIsOwner} />
      </div>
    </Page>
  );
}
