import { requireUser } from '@/lib/auth';
import { settings } from '@/lib/biz';
import { CONTENT_KEYS } from '@/lib/queries/owner';
import { Page } from '@/components/ui';
import { SettingsForm } from '@/components/settings-form';

export const metadata = { title: 'Website Content' };

export default async function Content() {
  await requireUser('owner');
  return <Page title="Website Content"><SettingsForm mode="content" keys={CONTENT_KEYS} values={await settings()} /></Page>;
}
