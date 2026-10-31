import { api, ok, invalid, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { tx, db } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now } from '@/lib/util';
import { pct } from '@/lib/deduction-shared';
import { deductionInput } from '@/lib/queries/deductions';

/** Owner / admin: set up a payroll deduction. Nothing is pre-filled or assumed: the name and percentage are typed in and confirmed here. */
export const POST = api(async (req) => {
  const user = await apiUser('owner');
  const { b } = await form(req);
  const { d, errors } = deductionInput(b);
  if (!errors.name && await db.get('SELECT 1 FROM deductions WHERE name=?', [d.name])) errors.name = 'A deduction with this name already exists. Edit that one instead.';
  if (Object.keys(errors).length) return invalid(errors);
  const id = await tx(async (t) => {
    const i = (await t.run('INSERT INTO deductions (name,kind,basis,created_by,created_at) VALUES (?,?,?,?,?)', [d.name, 'percent', 'gross', user.id, now()])).id;
    await t.run('INSERT INTO deduction_rates (deduction_id,rate_bp,active,effective_from,changed_by,changed_at) VALUES (?,?,?,?,?,?)', [i, d.bp, d.active, d.from, user.id, now()]);
    return i;
  });
  await audit({ user, ip: clientIp(req) }, 'deduction.create', 'deduction', id, { name: d.name, rate: pct(d.bp), active: d.active, effective_from: d.from });
  return ok(`${d.name} – ${pct(d.bp)} added${d.active ? '' : ' (inactive)'}. It applies to payroll periods ending on or after ${d.from}.`);
});
