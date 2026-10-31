// Payroll deduction helpers shared by the server and the browser (no database access here).
//  * A rate is stored in basis points (1 bp = 0.01 %), so 5 % = 500 and amounts are exact integer centavos.
//  * Deduction amount = applicable payroll basis x percentage / 100.
//  * Only percentage deductions on gross salary exist today. `kind` and `basis` are stored with every deduction and every payroll
//    line, so fixed amounts, brackets, ceilings or other bases (basic pay, taxable income) can be added later without touching
//    old payroll.
export const DEDUCTION_KINDS: Record<string, string> = { percent: 'Percentage' };
export const DEDUCTION_BASES: Record<string, string> = { gross: 'Gross salary' };

/** 500 -> "5%", 1250 -> "12.5%", 275 -> "2.75%". */
export const pct = (bp: number) => `${(bp / 100).toFixed(2).replace(/\.?0+$/, '')}%`;

/** Deduction amount in centavos for a basis (centavos) and a rate (basis points). Never negative. */
export const deductionAmount = (basis: number, bp: number) => (basis > 0 ? Math.round((basis * bp) / 10000) : 0);

/**
 * Parse what the owner typed into the Deduction Percentage field. Accepts digits with one optional decimal point (up to 2
 * decimals) and an optional trailing "%"; rejects negatives, letters, other symbols and anything outside 0.01 - 100.
 */
export function parsePercent(raw: unknown): { bp: number } | { error: string } {
  const s = String(raw ?? '').trim().replace(/%$/, '').trim();
  if (!s) return { error: 'Enter the deduction percentage.' };
  if (!/^\d+(\.\d{1,2})?$/.test(s)) return { error: 'Use numbers only, with up to 2 decimals (e.g. 5 or 2.75). Negative values and symbols are not allowed.' };
  const n = Number(s);
  if (n <= 0) return { error: 'The percentage must be greater than 0.' };
  if (n > 100) return { error: 'The percentage cannot be more than 100.' };
  return { bp: Math.round(n * 100) };
}

export interface DeductionLine { id: number | null; name: string; kind: string; rate_bp: number; basis_amount: number; amount: number }

/** Apply a list of active deductions to a gross salary: one line per deduction, plus the total. */
export function applyDeductions(gross: number, list: { id: number | null; name: string; kind: string; rate_bp: number }[]) {
  const lines: DeductionLine[] = list.map((d) => ({ ...d, basis_amount: Math.max(0, gross), amount: deductionAmount(gross, d.rate_bp) }));
  return { lines, total: lines.reduce((a, l) => a + l.amount, 0) };
}
