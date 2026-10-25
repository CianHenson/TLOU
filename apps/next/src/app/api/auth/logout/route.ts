import { api, clientIp, ok } from '@/lib/http';
import { audit } from '@/lib/biz';
import { currentUser, endSession } from '@/lib/auth';

export const POST = api(async (req) => {
  const user = await currentUser();
  await audit({ user, ip: clientIp(req) }, 'logout', 'user', user?.id, '');
  await endSession();
  return ok(undefined, { redirect: '/login' });
});
