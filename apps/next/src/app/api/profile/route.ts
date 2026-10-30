import { api, form, invalid, ok } from '@/lib/http';
import { db } from '@/lib/db';
import { apiUser } from '@/lib/auth';
import { str } from '@/lib/util';

/** Own-profile update: name and email (the login). Role and schedule stay owner-managed. */
export const POST = api(async (req) => {
  const user = await apiUser();
  const { b } = await form(req);
  const u = (await db.get('SELECT id FROM users WHERE id=?', [user.id]))!;
  const first_name = str(b.first_name, 60), last_name = str(b.last_name, 60), email = str(b.email, 160).toLowerCase();
  const errors: Record<string, string> = {};
  if (!first_name) errors.first_name = 'Required.';
  if (!last_name) errors.last_name = 'Required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email.';
  else if (await db.get('SELECT 1 FROM users WHERE (LOWER(email)=? OR LOWER(username)=?) AND id!=?', [email, email, u.id])) errors.email = 'Already registered.';
  if (Object.keys(errors).length) return invalid(errors);
  // `username` is kept equal to the email (the column is required and used by the audit log).
  await db.run('UPDATE users SET name=?,first_name=?,last_name=?,username=?,email=? WHERE id=?',
    [`${first_name} ${last_name}`.trim().slice(0, 120), first_name, last_name, email, email, u.id]);
  return ok('Profile updated.');
});
