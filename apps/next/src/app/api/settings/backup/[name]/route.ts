import fs from 'node:fs/promises';
import { api, fail, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { audit } from '@/lib/biz';
import { backupPath, listBackups } from '@/lib/backup';

export const GET = api(async (req, ctx) => {
  const user = await apiUser('owner');
  const { name } = await ctx.params;
  const n = (await listBackups()).find((f) => f === name);
  if (!n) return fail('Backup not found.', 404);
  await audit({ user, ip: clientIp(req) }, 'backup.download', 'system', n, '');
  const buf = await fs.readFile(backupPath(n));
  return new Response(new Uint8Array(buf), {
    headers: { 'Content-Type': 'application/sql; charset=utf-8', 'Content-Disposition': `attachment; filename="${n}"`, 'X-Content-Type-Options': 'nosniff' },
  });
});
