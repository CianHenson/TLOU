import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now, today } from '@/lib/util';

/**
 * Owner / admin: activate (`active=1`) or deactivate (`active=0`) one or more deductions from today (`ids` = comma-separated).
 * Like a single toggle, each one gets a new rate version with the same rate, so payroll that was already generated is unchanged.
 */
export const POST = api(async (req) => {
  const user = await apiUser('owner');
  const { b } = await form(req);
  const active = String(b.active) === '1' ? 1 : 0;
  const ids = [...new Set(String(b.ids ?? '').split(',').map(Number).filter((n) => Number.isInteger(n) && n > 0))].slice(0, 500);
  if (!ids.length) return fail('Select at least one deduction.');
  let n = 0;
  for (const id of ids) {
    const d = await db.get('SELECT * FROM deductions WHERE id=?', [id]);
    if (!d) continue;
    const cur = (await db.get('SELECT * FROM deduction_rates WHERE deduction_id=? AND effective_from<=? ORDER BY effective_from DESC, id DESC LIMIT 1', [id, today()]))
      ?? (await db.get('SELECT * FROM deduction_rates WHERE deduction_id=? ORDER BY effective_from, id LIMIT 1', [id]));
    if (!cur || cur.active === active) continue;
    await db.run('INSERT INTO deduction_rates (deduction_id,rate_bp,active,effective_from,changed_by,changed_at) VALUES (?,?,?,?,?,?)', [id, cur.rate_bp, active, today(), user.id, now()]);
    await audit({ user, ip: clientIp(req) }, active ? 'deduction.activate' : 'deduction.deactivate', 'deduction', id, { name: d.name });
    n++;
  }
  if (!n) return ok(active ? 'Already active.' : 'Already deactivated.');
  return ok(`${n} ${n === 1 ? 'deduction' : 'deductions'} ${active ? 'activated' : 'deactivated'}. New payroll ${active ? 'will' : 'will not'} deduct ${n === 1 ? 'it' : 'them'}; past payroll is unchanged.`);
});
