import { api } from '@/lib/http';
import { apiUser, isOwner } from '@/lib/auth';
import { db } from '@/lib/db';
import { sendStored } from '@/lib/files';

/**
 * E-signature image. `me` is the signed-in user's own (profile preview); a number is a payroll id and returns the signature of
 * whoever prepared that payslip, for the people allowed to open the payslip (owner / admin, or the employee it belongs to).
 */
export const GET = api(async (_req, ctx) => {
  const user = await apiUser();
  const { id } = await ctx.params;
  let sig: string | null | undefined;
  if (id === 'me') sig = (await db.get('SELECT signature FROM users WHERE id=?', [user.id]))?.signature;
  else if (/^\d+$/.test(id)) {
    const p = await db.get('SELECT p.user_id, c.signature FROM payroll p LEFT JOIN users c ON c.id=p.created_by WHERE p.id=?', [id]);
    if (p && (isOwner(user) || p.user_id === user.id)) sig = p.signature;
  }
  if (!sig) return new Response('Not found', { status: 404 });
  return sendStored(sig, 'signature' + sig.slice(sig.lastIndexOf('.')), true);
});
