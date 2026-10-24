import { requireUser } from '@/lib/auth';
import { Page } from '@/components/ui';
import { CustomerForm } from '@/components/core-customer-form';

export const metadata = { title: 'New customer' };

export default async function NewCustomer() {
  await requireUser();
  return <Page title="New customer"><CustomerForm /></Page>;
}
