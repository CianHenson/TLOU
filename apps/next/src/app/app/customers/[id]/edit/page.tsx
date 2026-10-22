import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { Page } from '@/components/ui';
import { CustomerForm } from '@/components/core-customer-form';

export const metadata = { title: 'Edit customer' };

export default async function EditCustomer(props: PageProps<'/app/customers/[id]/edit'>) {
  await requireUser();
  const { id } = await props.params;
  const c = await db.get('SELECT * FROM customers WHERE id=?', [id]);
  if (!c) notFound();
  return <Page title="Edit customer"><CustomerForm c={{ id: c.id, name: c.name, phone: c.phone ?? '', email: c.email ?? '', pref_contact: c.pref_contact ?? '', notes: c.notes ?? '' }} /></Page>;
}
