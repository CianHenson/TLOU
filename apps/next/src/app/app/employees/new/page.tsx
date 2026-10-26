import { requireUser } from '@/lib/auth';
import { Page } from '@/components/ui';
import { EmployeeForm } from '@/components/employee-form';

export const metadata = { title: 'Add user' };

export default async function NewEmployee() {
  await requireUser('owner');
  return (
    <Page title="Add user">
      <EmployeeForm isNew e={{ role: 'employee', active: 1 }} />
    </Page>
  );
}
