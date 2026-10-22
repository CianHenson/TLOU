import { requireUser } from '@/lib/auth';
import { Page } from '@/components/ui';
import { EmployeeForm } from '@/components/employee-form';

export const metadata = { title: 'New employee' };

export default async function NewEmployee() {
  await requireUser('owner');
  return (
    <Page title="New employee">
      <EmployeeForm isNew e={{ role: 'employee', active: 1, sched_start: '08:00', sched_end: '17:00', grace_min: 10, break_min: 60, workdays: '1,2,3,4,5' }} />
    </Page>
  );
}
