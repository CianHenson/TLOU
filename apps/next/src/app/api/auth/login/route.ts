import { api, clientIp, fail, form, ok } from '@/lib/http';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { startSession } from '@/lib/auth';
import { verifyPassword } from '@/lib/password';
import { clearLimit, limited } from '@/lib/limiter';

const W = 15 * 60 * 1000;

export const POST = api(async (req) => {
  const ip = clientIp(req), key = `login:${ip}`;
  if (limited(key, 10, W, true)) return fail('Too many login attempts. Try again in 15 minutes.', 429);
  const { b } = await form(req);
  const username = String(b.username || '').trim().toLowerCase();
  const u = await db.get('SELECT * FROM users WHERE lower(username)=?', [username]);
  const good = (await verifyPassword(String(b.password || ''), u?.password_hash)) && u && u.active;
  if (!good) {
    limited(key, 10, W); // only failed attempts count
    await audit({ ip }, 'login.fail', 'user', null, username.slice(0, 60));
    return fail('Invalid username or password.', 400); // not 401: ApiForm treats 401 as "session expired"
  }
  clearLimit(key);
  await startSession(u!.id, !!b.remember);
  await audit({ user: { id: u!.id, username: u!.username }, ip }, 'login', 'user', u!.id, '');
  return ok(undefined, { redirect: u!.must_change_pw ? '/app/profile' : '/app' });
});
