import { api, ok, fail, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { tx, db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now, today } from '@/lib/util';
import { pct } from '@/lib/deduction-shared';
import { deductionInput } from '@/lib/queries/deductions';

/**
 * Owner / admin: edit a deduction, or (`toggle=1` with `active`) activate / deactivate it from today. A change never rewrites the old
 * rate: it adds a new version with its own effective date, so payroll that was already generated keeps the lines it was generated with.
 */
export const POST = api(async (req, ctx) => {
  const user = await apiUser('owner');
  const { id } = await ctx.params;
  const old = /^\d+$/.test(id) ? await db.get('SELECT * FROM deductions WHERE id=?', [id]) : undefined;
  if (!old) return fail('Deduction not found.', 404);
  const { b } = await form(req);
  const meta = { user, ip: clientIp(req) };
  const cur = (await db.get('SELECT * FROM deduction_rates WHERE deduction_id=? AND effective_from<=? ORDER BY effective_from DESC, id DESC LIMIT 1', [old.id, today()]))
    ?? (await db.get('SELECT * FROM deduction_rates WHERE deduction_id=? ORDER BY effective_from, id LIMIT 1', [old.id]))!;

  if (b.toggle === '1') {
    const active = b.active === '1' ? 1 : 0;
    await db.run('INSERT INTO deduction_rates (deduction_id,rate_bp,active,effective_from,changed_by,changed_at) VALUES (?,?,?,?,?,?)', [old.id, cur.rate_bp, active, today(), user.id, now()]);
    await audit(meta, active ? 'deduction.activate' : 'deduction.deactivate', 'deduction', old.id, { name: old.name });
    return ok(active ? `${old.name} is now active and will be included in new payroll.` : `${old.name} deactivated. New payroll will not deduct it; past payroll is unchanged.`);
  }
  const { d, errors } = deductionInput(b);
  if (!errors.name && await db.get('SELECT 1 FROM deductions WHERE name=? AND id<>?', [d.name, old.id])) errors.name = 'Another deduction already has this name.';
  if (Object.keys(errors).length) return invalid(errors);
  const changed = d.bp !== cur.rate_bp || d.active !== cur.active;
  await tx(async (t) => {
    if (d.name !== old.name) await t.run('UPDATE deductions SET name=? WHERE id=?', [d.name, old.id]);
    if (changed) await t.run('INSERT INTO deduction_rates (deduction_id,rate_bp,active,effective_from,changed_by,changed_at) VALUES (?,?,?,?,?,?)', [old.id, d.bp, d.active, d.from, user.id, now()]);
  });
  await audit(meta, 'deduction.update', 'deduction', old.id, { before: { name: old.name, rate: pct(cur.rate_bp), active: cur.active }, after: { name: d.name, rate: pct(d.bp), active: d.active, effective_from: changed ? d.from : null } });
  return ok(changed ? `${d.name} – ${pct(d.bp)} saved. It applies to payroll periods ending on or after ${d.from}; earlier payroll is unchanged.` : 'Deduction saved.');
});
