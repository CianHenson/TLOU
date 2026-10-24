import { api, ok, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { audit } from '@/lib/biz';
import { createBackup } from '@/lib/backup';

export const POST = api(async (req) => {
  const user = await apiUser('owner');
  const n = await createBackup('manual');
  await audit({ user, ip: clientIp(req) }, 'backup.create', 'system', n, '');
  return ok('Backup created: ' + n);
});
