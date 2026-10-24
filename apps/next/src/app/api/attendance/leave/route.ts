import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { isDate, str } from '@/lib/util';

export const POST = api(async (req) => {
  const user = await apiUser('owner');
  const { b } = await form(req);
  const day = str(b.day, 10), kind = b.kind === 'Holiday' ? 'Holiday' : 'Leave', uid = /^\d+$/.test(String(b.user_id ?? '')) ? Number(b.user_id) : null;
  if (!isDate(day)) return fail('Enter a valid date.');
  if (kind === 'Leave' && !uid) return fail('Choose the employee on leave.');
  if (await db.get('SELECT 1 FROM leaves WHERE user_id <=> ? AND day=? AND kind=?', [uid, day, kind])) return fail('That entry already exists.');
  const { id } = await db.run('INSERT INTO leaves (user_id,day,kind,note) VALUES (?,?,?,?)', [kind === 'Holiday' ? null : uid, day, kind, str(b.note, 200)]);
  await audit({ user, ip: clientIp(req) }, 'leave.add', 'leave', id, { day, kind, uid });
  return ok(`${kind} recorded.`);
});
