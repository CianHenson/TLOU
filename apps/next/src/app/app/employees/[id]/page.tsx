import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Page } from '@/components/ui';
import { EmployeeForm } from '@/components/employee-form';

export const metadata = { title: 'Edit employee' };

export default async function EditEmployee({ params }: PageProps<'/app/employees/[id]'>) {
  const me = await requireUser('owner');
  const { id } = await params;
  const e = /^\d+$/.test(id) ? await db.get('SELECT * FROM users WHERE id=?', [id]) : undefined;
  // Admins never see the owner account.
  if (!e || (e.role === 'owner' && e.id !== me.id)) notFound();
  return (
    <Page title={e.name}>
      <EmployeeForm isNew={false} e={{ id: e.id, first_name: e.first_name ?? '', last_name: e.last_name ?? '', email: e.email ?? '', username: e.username, role: e.role, designation: e.designation ?? '', active: e.active, can_expenses: e.can_expenses }} />
    </Page>
  );
}
