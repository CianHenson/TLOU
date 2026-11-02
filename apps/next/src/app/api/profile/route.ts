import { api, form, invalid, ok } from '@/lib/http';
import { db } from '@/lib/db';
import { apiUser } from '@/lib/auth';
import { str } from '@/lib/util';
import { isOwner } from '@/lib/auth';
import { saveUpload, UPLOAD_DIR } from '@/lib/files';
import fs from 'node:fs/promises';
import path from 'node:path';

/** Own-profile update: name and email (the login). Role and schedule stay owner-managed. */
export const POST = api(async (req) => {
  const user = await apiUser();
  const { b } = await form(req);
  const u = (await db.get('SELECT id, signature FROM users WHERE id=?', [user.id]))!;
  const first_name = str(b.first_name, 60), last_name = str(b.last_name, 60), email = str(b.email, 160).toLowerCase();
  const errors: Record<string, string> = {};
  if (!first_name) errors.first_name = 'Required.';
  if (!last_name) errors.last_name = 'Required.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Enter a valid email.';
  else if (await db.get('SELECT 1 FROM users WHERE (LOWER(email)=? OR LOWER(username)=?) AND id!=?', [email, email, u.id])) errors.email = 'Already registered.';
  // E-signature (owner / admin only): an image used on the payslips they prepare.
  let signature: string | null | undefined;
  if (isOwner(user)) {
    const f = b.signature;
    if (f && typeof f !== 'string' && f.size > 0) {
      if (!['.png', '.jpg', '.jpeg'].includes(path.extname(f.name).toLowerCase())) errors.signature = 'Use a PNG or JPG image.';
      else {
        const up = await saveUpload(f);
        if (up && 'error' in up) errors.signature = up.error; else if (up) signature = up.stored;
      }
    } else if (b.remove_signature === 'on') signature = null;
  }
  if (Object.keys(errors).length) return invalid(errors);
  // `username` is kept equal to the email (the column is required and used by the audit log).
  await db.run('UPDATE users SET name=?,first_name=?,last_name=?,username=?,email=? WHERE id=?',
    [`${first_name} ${last_name}`.trim().slice(0, 120), first_name, last_name, email, email, u.id]);
  if (signature !== undefined) {
    await db.run('UPDATE users SET signature=? WHERE id=?', [signature, u.id]);
    if (u.signature) await fs.unlink(path.join(UPLOAD_DIR, path.basename(u.signature))).catch(() => {});
  }
  return ok('Profile updated.');
});
