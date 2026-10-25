import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Page } from '@/components/ui';
import { EmployeeForm } from '@/components/employee-form';

export const metadata = { title: 'Edit employee' };

export default async function EditEmployee({ params }: PageProps<'/app/employees/[id]'>) {
  await requireUser('owner');
  const { id } = await params;
  const e = /^\d+$/.test(id) ? await db.get('SELECT * FROM users WHERE id=?', [id]) : undefined;
  if (!e) notFound();
  return (
    <Page title={e.name}>
      <EmployeeForm isNew={false} e={{ id: e.id, name: e.name, email: e.email ?? '', username: e.username, role: e.role, designation: e.designation ?? '', active: e.active, can_expenses: e.can_expenses,
        sched_start: e.sched_start, sched_end: e.sched_end, grace_min: e.grace_min, break_min: e.break_min, workdays: e.workdays }} />
    </Page>
  );
}
