import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, isOwner } from '@/lib/auth';
import { db } from '@/lib/db';
import { settings } from '@/lib/biz';
import { hrs, longDate, peso } from '@/lib/util';
import { Page } from '@/components/ui';
import { PrintButton } from '@/components/widgets';
import { pct } from '@/lib/deduction-shared';
import { ROLE_LABELS } from '@/lib/types';
import { payrollLines } from '@/lib/queries/deductions';

export const metadata = { title: 'Payslip' };

/**
 * Printable payslip, read from the saved payroll record (never recalculated). Owners / admins can open any payslip;
 * an employee only their own — anyone else gets "not found".
 */
export default async function Payslip({ params }: PageProps<'/app/payslip/[id]'>) {
  const me = await requireUser();
  const { id } = await params;
  const p = /^\d+$/.test(id) ? await db.get(`SELECT p.*, u.name, u.emp_no, u.designation, c.name AS created_by_name, c.designation AS created_by_designation, c.role AS created_by_role, c.signature AS created_by_sig FROM payroll p JOIN users u ON u.id=p.user_id
    LEFT JOIN users c ON c.id=p.created_by WHERE p.id=?`, [id]) : undefined;
  if (!p || (!isOwner(me) && p.user_id !== me.id)) notFound();
  const S = await settings();
  // Older payslips (before deductions existed) have no gross figure: gross = basic + adjustments and nothing was deducted.
  const lines = await payrollLines(p.id);
  const gross = p.gross_pay ?? p.basic_pay + p.adjustments;
  const back = isOwner(me) ? '/app/attendance-monitor?tab=payroll' : '/app/attendance';
  return (
    <Page title="Payslip" actions={<><Link className="btn ghost" href={back}>Back</Link><PrintButton className="btn">Print / Save as PDF</PrintButton></>}>
      <article className="card payslip">
        <header className="ps-head">
          <div><h2>{S.business_name}</h2><div className="small muted">{S.address || S.location}</div></div>
          <div style={{ textAlign: 'right' }}><strong>PAYSLIP</strong><div className="small muted">No. PS-{String(p.id).padStart(5, '0')}</div><div className="small muted">Generated {longDate(p.created_at.slice(0, 10))}</div></div>
        </header>
        <h3 className="ps-h">Employee Information</h3>
        <div className="ps-info">
          <div><span>Employee Name:</span><strong>{p.name}</strong>{p.emp_no ? <em> · {p.emp_no}</em> : null}</div>
          <div><span>Payroll Period:</span>{longDate(p.period_from)} – {longDate(p.period_to)} <em>({p.period_kind})</em></div>
          <div><span>Position:</span>{p.designation || '—'}</div>
        </div>
        <div className="ps-cols">
        <div>
        <h3 className="ps-h">Salary Breakdown</h3>
        <table><tbody>
          <tr><td>Working days</td><td className="num">{p.days}</td></tr>
          <tr><td>Total hours worked</td><td className="num">{hrs(p.minutes)}</td></tr>
          <tr><td>Hourly rate</td><td className="num">{peso(p.hourly_rate)}</td></tr>
          <tr><td>Basic pay <span className="muted small">({hrs(p.minutes)} h × {peso(p.hourly_rate)})</span></td><td className="num">{peso(p.basic_pay)}</td></tr>
          <tr><td>{p.adjustments < 0 ? 'Adjustment (deduction)' : 'Adjustments'}{p.adjustment_note ? <span className="muted small"> — {p.adjustment_note}</span> : null}</td><td className="num">{p.adjustments ? peso(p.adjustments) : '—'}</td></tr>
          <tr className="ps-sub"><td><strong>Gross salary</strong></td><td className="num"><strong>{peso(gross)}</strong></td></tr>
        </tbody></table>
        </div>
        <div>
        <h3 className="ps-h">Deductions</h3>
        <table><tbody>
          {lines.map((l) => (
            <tr key={l.id}><td>{l.name} – {pct(l.rate_bp)} <span className="muted small">({pct(l.rate_bp)} of {peso(l.basis_amount)} gross)</span></td><td className="num">− {peso(l.amount)}</td></tr>
          ))}
          {!lines.length && <tr><td className="muted">No deductions were applied to this payroll.</td><td className="num">—</td></tr>}
          <tr className="ps-sub"><td><strong>Total deductions</strong></td><td className="num"><strong>{p.total_deductions ? '− ' + peso(p.total_deductions) : peso(0)}</strong></td></tr>
        </tbody></table>
        <div className="ps-net"><span>Net pay</span><strong>{peso(p.net_pay)}</strong></div>
        </div>
        </div>
        {p.incomplete > 0 && <p className="small muted">{p.incomplete} day{p.incomplete === 1 ? '' : 's'} with a time-in but no time-out {p.incomplete === 1 ? 'was' : 'were'} not paid.</p>}
        <div className="ps-sign">
          {p.created_by_sig && <img src={`/api/files/signature/${p.id}`} alt="E-signature" />}
          <div className="ps-sign-line"><strong>{p.created_by_name || '—'}</strong><div className="small muted">{p.created_by_designation || ROLE_LABELS[p.created_by_role] || ''}</div></div>
        </div>
      </article>
    </Page>
  );
}
