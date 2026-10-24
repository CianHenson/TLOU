import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db, tx } from '@/lib/db';
import { audit, STATUSES } from '@/lib/biz';
import { intOrNull, str, now } from '@/lib/util';

export const POST = api(async (req, ctx) => {
  const user = await apiUser();
  const { id } = await ctx.params;
  const r = await db.get('SELECT * FROM requests WHERE id=?', [id]);
  if (!r) return fail('Request not found.', 404);
  const { b } = await form(req);
  const to = String(b.status ?? ''), note = str(b.note, 1000);
  if (!STATUSES.includes(to)) return fail('Invalid status.');
  if (to === r.status && !note) return fail('Status unchanged.');
  const assignee = intOrNull(b.assigned_to);
  await tx(async (d) => {
    await d.run('UPDATE requests SET status=?, assigned_to=COALESCE(?, assigned_to, ?) WHERE id=?', [to, assignee, user.id, r.id]);
    await d.run('INSERT INTO request_log (request_id,from_status,to_status,note,user_id,at) VALUES (?,?,?,?,?,?)', [r.id, r.status, to, note, user.id, now()]);
  });
  await audit({ user, ip: clientIp(req) }, 'request.status', 'request', r.id, `${r.status} -> ${to}`);
  return ok('Request updated.');
});
