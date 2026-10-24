import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { str } from '@/lib/util';

export const POST = api(async (req, ctx) => {
  const user = await apiUser('owner');
  const { id } = await ctx.params;
  const p = await db.get('SELECT * FROM payments WHERE id=?', [id]);
  if (!p) return fail('Payment not found.', 404);
  const { b } = await form(req);
  const reason = str(b.reason, 500);
  if (!reason) return fail('A reason is required to reverse a payment.');
  if (p.status !== 'Valid') return fail('Already reversed.');
  await db.run(`UPDATE payments SET status='Reversed', reversed_by=?, reversed_reason=? WHERE id=?`, [user.id, reason, p.id]);
  await audit({ user, ip: clientIp(req) }, 'payment.reverse', 'payment', p.id, { amount: p.amount, kind: p.kind, reason });
  return ok('Payment reversed; it no longer counts in totals but remains on record.');
});
