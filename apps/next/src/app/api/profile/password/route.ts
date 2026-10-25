import { api, clientIp, fail, form, ok } from '@/lib/http';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { apiUser } from '@/lib/auth';
import { hashPassword, strongEnough, verifyPassword } from '@/lib/password';

export const POST = api(async (req) => {
  const user = await apiUser();
  const { b } = await form(req);
  const u = (await db.get('SELECT id,password_hash FROM users WHERE id=?', [user.id]))!;
  const current = String(b.current || ''), next = String(b.next || ''), confirm = String(b.confirm || '');
  if (!(await verifyPassword(current, u.password_hash))) return fail('Current password is incorrect.');
  if (!strongEnough(next)) return fail('New password must be at least 10 characters and include letters and numbers.');
  if (next !== confirm) return fail('New passwords do not match.');
  await db.run('UPDATE users SET password_hash=?, must_change_pw=0 WHERE id=?', [await hashPassword(next), u.id]);
  await audit({ user, ip: clientIp(req) }, 'password.change', 'user', u.id, '');
  return ok('Password updated.', { redirect: '/app/profile' });
});
