import { requireUser } from '@/lib/auth';
import { Page } from '@/components/ui';
import { RequestForm } from '@/components/core-request-form';
import { customerOptions } from '@/lib/queries/core';

export const metadata = { title: 'Register request' };

export default async function NewRequest(props: PageProps<'/app/requests/new'>) {
  await requireUser();
  const sp = await props.searchParams;
  const customer = Array.isArray(sp.customer) ? sp.customer[0] : sp.customer;
  return <Page title="Register request"><RequestForm customers={await customerOptions()} customerId={customer} /></Page>;
}
