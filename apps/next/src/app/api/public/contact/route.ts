import { api, clientIp, fail, form, invalid, ok } from '@/lib/http';
import { db } from '@/lib/db';
import { limited } from '@/lib/limiter';
import { isEmail, now, str } from '@/lib/util';

export const POST = api(async (req) => {
  if (limited(`pub:${clientIp(req)}`, 15, 15 * 60 * 1000)) return fail('Too many submissions. Please try again later.', 429);
  const { b } = await form(req);
  if (b.website) return ok(undefined, { redirect: '/contact' }); // honeypot
  const v = { name: str(b.name, 120), email: str(b.email, 160), phone: str(b.phone, 40), body: str(b.body, 3000) };
  const errors: Record<string, string> = {};
  if (!v.name) errors.name = 'Required.';
  if (!isEmail(v.email)) errors.email = 'Enter a valid email.';
  if (!v.body) errors.body = 'Required.';
  if (b.consent !== 'on') errors.consent = 'Please accept the privacy notice.';
  if (Object.keys(errors).length) return invalid(errors);
  await db.run('INSERT INTO messages (name,email,phone,body,at) VALUES (?,?,?,?,?)', [v.name, v.email, v.phone, v.body, now()]);
  return ok('Thank you! Your message was sent. We will get back to you soon.', { redirect: '/#contact' });
});
