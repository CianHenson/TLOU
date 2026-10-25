import { requireUser } from '@/lib/auth';
import { today } from '@/lib/util';
import { Page } from '@/components/ui';
import { AirfareForm } from '@/components/airfare-form';

export const metadata = { title: 'New airfare sale' };

export default async function NewAirfare() {
  await requireUser();
  const td = today();
  return (
    <Page title="New airfare sale">
      <AirfareForm today={td} a={{ txn_date: td, pax: 1, checkin_status: 'Pending' }} />
    </Page>
  );
}
