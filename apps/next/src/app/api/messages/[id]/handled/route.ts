import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';

/** Owner / admin: mark a contact-form message as handled (default) or back to new (`handled=0`). Messages are never deleted. */
export const POST = api(async (req, ctx) => {
  const user = await apiUser('messages');
  const { id } = await ctx.params;
  const m = /^\d+$/.test(id) ? await db.get('SELECT id,name,handled FROM messages WHERE id=?', [id]) : undefined;
  if (!m) return fail('Message not found.', 404);
  const { b } = await form(req);
  const handled = String(b.handled ?? '1') === '0' ? 0 : 1;
  if (m.handled !== handled) {
    await db.run('UPDATE messages SET handled=? WHERE id=?', [handled, m.id]);
    await audit({ user, ip: clientIp(req) }, handled ? 'message.handled' : 'message.reopen', 'message', m.id, { from: m.name });
  }
  return ok(handled ? 'Marked as handled.' : 'Marked as new.');
});
