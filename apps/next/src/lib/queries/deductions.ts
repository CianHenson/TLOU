// Payroll deductions: configuration (owner / admin only), the rate in force on a date, and the change history. Server-only.
// Each deduction has versions in `deduction_rates` (rate, active flag, effective-from date). The version in force on a date is the
// latest one whose effective_from is on or before it, so a new rate only reaches payroll periods ending on or after its date and
// payroll that was already generated is never recalculated (it keeps its own frozen lines in payroll_deductions).
import 'server-only';
import { db } from '../db';
import { where } from '../list';
import { addDays, isDate, str, today } from '../util';
import { parsePercent } from '../deduction-shared';
import type { Row } from '../types';

/** The version in force on `day` for each deduction, as a subquery over alias `r`. */
const IN_FORCE = `SELECT r.* FROM deduction_rates r WHERE r.id = (
  SELECT r2.id FROM deduction_rates r2 WHERE r2.deduction_id=r.deduction_id AND r2.effective_from<=? ORDER BY r2.effective_from DESC, r2.id DESC LIMIT 1)`;

/** Active deductions (with their rate) in force on `day` - the ones a payroll period ending that day must apply. */
export async function activeDeductionsOn(day: string) {
  return db.all<{ id: number; name: string; kind: string; basis: string; rate_bp: number }>(
    `SELECT d.id, d.name, d.kind, d.basis, v.rate_bp FROM deductions d JOIN (${IN_FORCE}) v ON v.deduction_id=d.id WHERE v.active=1 ORDER BY d.name`, [day]);
}

export interface DeductionRow extends Row {
  id: number; name: string; kind: string; basis: string; rate_bp: number; active: number; effective_from: string;
  next_bp: number | null; next_active: number | null; next_from: string | null; updated_at: string;
}

export function deductionQuery(q: Record<string, string>): [string, unknown[]] {
  const w = where();
  const td = today();
  if (q.q) w.add('d.name LIKE ?', `%${str(q.q, 60)}%`);
  if (q.status === 'active') w.add('cur.active=1'); else if (q.status === 'inactive') w.add('cur.active=0');
  // `cur` = version in force today (or, for a deduction that only starts in the future, its first version); `nxt` = the next scheduled change.
  const sql = `SELECT d.id, d.name, d.kind, d.basis, d.created_at, cur.rate_bp, cur.active, cur.effective_from, cur.changed_at AS updated_at,
      nxt.rate_bp AS next_bp, nxt.active AS next_active, nxt.effective_from AS next_from
    FROM deductions d
    JOIN deduction_rates cur ON cur.id = COALESCE(
      (SELECT x.id FROM deduction_rates x WHERE x.deduction_id=d.id AND x.effective_from<=? ORDER BY x.effective_from DESC, x.id DESC LIMIT 1),
      (SELECT x.id FROM deduction_rates x WHERE x.deduction_id=d.id ORDER BY x.effective_from ASC, x.id ASC LIMIT 1))
    LEFT JOIN deduction_rates nxt ON nxt.id = (SELECT x.id FROM deduction_rates x WHERE x.deduction_id=d.id AND x.effective_from>? AND x.id<>cur.id ORDER BY x.effective_from ASC, x.id ASC LIMIT 1)
    ${w.sql} ORDER BY cur.active DESC, d.name`;
  return [sql, [td, td, ...w.p]];
}

/** Every rate change, newest first (the audit trail shown on the Payroll Deductions page). */
export const deductionHistory = (limit = 100) => db.all(`SELECT r.*, d.name, u.name AS by_name FROM deduction_rates r JOIN deductions d ON d.id=r.deduction_id
  LEFT JOIN users u ON u.id=r.changed_by ORDER BY r.id DESC LIMIT ?`, [limit]);

/** Lines of one generated payroll record, as they were when it was generated. */
export const payrollLines = (payrollId: number) => db.all('SELECT * FROM payroll_deductions WHERE payroll_id=? ORDER BY id', [payrollId]);

/** Validate the Add / Edit Deduction form: name, percentage, status and the date the rate takes effect. */
export function deductionInput(b: Record<string, FormDataEntryValue | undefined>) {
  const errors: Record<string, string> = {};
  const name = str(b.name, 80).replace(/\s+/g, ' ');
  const active = b.active === 'Active' || b.active === '1' || b.active === 'on' ? 1 : 0;
  const from = str(b.effective_from, 10) || today();
  const rate = parsePercent(b.rate);
  if (name.length < 2) errors.name = 'Enter the deduction name (at least 2 characters).';
  else if (!/^[\p{L}\p{N}][\p{L}\p{N} .,&()/'-]*$/u.test(name)) errors.name = 'Use letters, numbers and basic punctuation only.';
  if ('error' in rate) errors.rate = rate.error;
  if (!isDate(from) || from < addDays(today(), -365) || from > addDays(today(), 365)) errors.effective_from = 'Choose a valid date within a year of today.';
  return { d: { name, active, from, bp: 'bp' in rate ? rate.bp : 0 }, errors };
}
