import { Page } from '@/components/ui';
import { requireUser } from '@/lib/auth';

export const metadata = { title: 'Forbidden' };

export default async function Forbidden() {
  await requireUser();
  return <Page title="Forbidden"><div className="card"><p>You do not have permission to open this page.</p></div></Page>;
}
