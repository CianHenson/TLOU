import { api, clientIp, form, invalid, ok } from '@/lib/http';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { apiUser } from '@/lib/auth';
import { PASSWORD_HINT, hashPassword, strongEnough, verifyPassword } from '@/lib/password';

export const POST = api(async (req) => {
  const user = await apiUser();
  const { b } = await form(req);
  const u = (await db.get('SELECT id,password_hash FROM users WHERE id=?', [user.id]))!;
  const current = String(b.current || ''), next = String(b.next || ''), confirm = String(b.confirm || '');
  const errors: Record<string, string> = {};
  if (!(await verifyPassword(current, u.password_hash))) errors.current = 'Current password is incorrect.';
  if (!strongEnough(next)) errors.next = PASSWORD_HINT;
  else if (next !== confirm) errors.confirm = 'Passwords do not match.';
  if (Object.keys(errors).length) return invalid(errors);
  await db.run('UPDATE users SET password_hash=?, must_change_pw=0 WHERE id=?', [await hashPassword(next), u.id]);
  await audit({ user, ip: clientIp(req) }, 'password.change', 'user', u.id, '');
  return ok('Password updated.');
});
