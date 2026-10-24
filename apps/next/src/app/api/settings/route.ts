import { api, ok, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { tx } from '@/lib/db';
import { audit } from '@/lib/biz';
import { str } from '@/lib/util';
import { CONTENT_KEYS, LONG_KEYS, SYSTEM_KEYS } from '@/lib/queries/owner';

export const POST = api(async (req) => {
  const user = await apiUser('owner');
  const { b } = await form(req);
  const mode = b.mode === 'content' ? 'content' : 'system';
  const allowed = mode === 'content' ? CONTENT_KEYS : SYSTEM_KEYS;
  const keys = allowed.filter((k) => k in b);
  await tx(async (d) => {
    for (const k of keys) await d.run('INSERT INTO settings (k,v) VALUES (?,?) ON DUPLICATE KEY UPDATE v=VALUES(v)', [k, str(b[k], LONG_KEYS.includes(k) ? 6000 : 400)]);
  });
  await audit({ user, ip: clientIp(req) }, 'settings.update', 'settings', mode, keys);
  return ok('Saved.');
});
