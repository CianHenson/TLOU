'use client';
// Attendance Monitoring → Payroll: generate a payroll record for an employee and period (saved as a snapshot), list
// them with totals, open the printable payslip (double-click or right-click) or delete a record to regenerate it.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hrs, longDate, peso } from '@/lib/util';
import { PAY_PERIODS, type Row } from '@/lib/types';
import { ApiForm, Field, Submit } from './form';
import { moneyInput } from './input-format';
import { DateRangeField } from './date-time-picker';
import { useRowSelection } from './row-select';
import { Modal, PlusButton, usePost } from './modal';
import { FootLine } from './ui';
import { pct } from '@/lib/deduction-shared';
import { SortGroupItems, useGroupOf, type SortGroup } from './sort-group';
import { groupedRows, monthOf } from './group-rows';

const SG: SortGroup = {
  sorts: [['name', 'Employee'], ['period', 'Payroll period'], ['days', 'Working days'], ['hours', 'Total hours'], ['rate', 'Hourly rate'], ['basic', 'Basic pay'], ['adjustments', 'Adjustments'], ['gross', 'Gross'], ['deductions', 'Deductions'], ['net', 'Net pay']],
  groups: [['name', 'Employee'], ['kind', 'Period type'], ['month', 'Period month']],
};

const add = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
/** Same rules as the server's payPeriod(). */
function period(kind: string, from: string, to: string): [string, string] {
  if (!from) return ['', ''];
  if (kind === 'Weekly') return [from, add(from, 6)];
  if (kind === 'Biweekly') return [from, add(from, 13)];
  if (kind === 'Monthly') { const [y, m] = from.split('-').map(Number); return [`${from.slice(0, 7)}-01`, add(m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`, -1)]; }
  return [from, to];
}
/** '2026-10-31' -> '10-31-2026' */
const mdy = (d: string) => `${d.slice(5, 7)}-${d.slice(8, 10)}-${d.slice(0, 4)}`;
const span = (a: string, b: string) => (a === b ? longDate(a) : `${longDate(a)} – ${longDate(b)}`);

const GENERATE_EVT = 'payroll:new';

/** "+" header button: generate payroll for one employee and period. Also opens from the table's empty-space menu. */
export function GeneratePayrollButton({ employees, today, deductions }: { employees: Row[]; today: string; deductions: { id: number; name: string; rate_bp: number }[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener(GENERATE_EVT, on);
    return () => window.removeEventListener(GENERATE_EVT, on);
  }, []);
  const [kind, setKind] = useState('Monthly');
  const [from, setFrom] = useState(`${today.slice(0, 7)}-01`);
  const [to, setTo] = useState(today);
  const [a, z] = period(kind, from, to);
  const ready = employees.filter((e) => e.hourly_rate > 0);
  return (
    <>
      <PlusButton label="Generate payroll" onClick={() => setOpen(true)} />
      {open && (
        <Modal title="Generate payroll" onClose={() => setOpen(false)}>
          {(close) => ready.length ? (
            <ApiForm action="/api/payroll" stay onDone={(d) => { if (d.ok) close(); }}>
              <Field name="employee_id" label="Employee *" type="select" emptyLabel="— Choose an employee —" attrs={{ required: true }}
                options={ready.map((e) => [e.employee_id, `${e.name} · ${peso(e.hourly_rate)}/hour`])} />
              <div className="grid g2">
                <div className="field"><label htmlFor="pp-kind">Payroll period *</label>
                  <select id="pp-kind" name="period_kind" value={kind} onChange={(e) => setKind(e.target.value)}>{PAY_PERIODS.map((p) => <option key={p}>{p}</option>)}</select></div>
                {kind === 'Custom'
                  ? <DateRangeField fromName="period_from" toName="period_to" label="Date range *" defaultFrom={from} defaultTo={to} max={today} onChange={(f, t) => { setFrom(f); setTo(t); }} />
                  : <div className="field"><label htmlFor="pp-from">{kind === 'Monthly' ? 'Month (any day in it) *' : 'Start date *'}</label>
                      <input id="pp-from" type="date" name="period_from" value={from} max={today} required onChange={(e) => setFrom(e.target.value)} /></div>}
              </div>
              {kind !== 'Custom' && a && z && <p className="small">Period: <strong>{span(a, z)}</strong>{z > today && <span className="badge b-warn" style={{ marginLeft: 6 }}>Ends after today — wait until it is over</span>}</p>}
              <div className="grid g2">
                <Field name="adjustments" label="Adjustment (₱, optional)" attrs={{ inputMode: 'decimal', placeholder: '0.00' }} hint="Positive adds (e.g. allowance), negative deducts (e.g. -250 cash advance)." />
                <Field name="adjustment_note" label="Adjustment note" attrs={{ maxLength: 200, placeholder: 'e.g. Cash advance' }} />
              </div>
              <div className="ded-box">
                <strong>Deductions that will be applied</strong>
                {deductions.length
                  ? <ul>{deductions.map((d) => <li key={d.id}>{d.name} – {pct(d.rate_bp)} <span className="muted">of gross salary</span></li>)}</ul>
                  : <p className="small muted" style={{ margin: '4px 0 0' }}>None. Add deductions under Payroll Deductions and set them Active.</p>}
              </div>
              <p className="small muted">Gross = hours from complete time-in/out records in the period × the employee&apos;s hourly rate (+ adjustment); net = gross − the deductions above. Approved leave, holidays and incomplete days are not paid. The result is saved and does not change if the rate or attendance changes later.</p>
              <div className="row"><Submit>Generate payroll</Submit> <button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
            </ApiForm>
          ) : (
            <div className="empty-state">
              <p><strong>No employees ready for payroll.</strong></p>
              <p className="small muted">Add employees and set their hourly rate in the Employees tab first.</p>
              <button type="button" className="btn ghost" onClick={close}>Close</button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

export function PayrollTable({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const { post } = usePost();
  const { wrap, sel, setSel, menu, setMenu, rowProps, selBox, emptyMenu } = useRowSelection(rows.map((r) => Number(r.id)), 110);
  const open = (id: number) => { setMenu(null); router.push(`/app/payslip/${id}`); };
  const remove = async (r: Row) => {
    setMenu(null);
    if (!window.confirm(`Delete ${r.name}'s payroll for ${span(r.period_from, r.period_to)}? Its payslip will no longer be available.`)) return;
    const d = await post(`/api/payroll/${r.id}/delete`);
    if (d.ok) setSel(new Set());
  };
  const groupOf = useGroupOf<Row>({ name: (r) => r.name, kind: (r) => r.period_kind, month: (r) => monthOf(r.period_from) });
  const picked = rows.filter((r) => sel.has(Number(r.id)));
  const sum = (list: Row[], k: string) => list.reduce((a, r) => a + Number(r[k] || 0), 0);
  const one = menu && menu.ids.length === 1 ? rows.find((r) => Number(r.id) === menu.ids[0]) : undefined;
  return (
    <div className="tw tw-fixed tw-fm tw-sel" ref={wrap} onContextMenu={emptyMenu}>
      <table><colgroup><col style={{ width: '13%' }} /><col style={{ width: '19%' }} /><col style={{ width: '7%' }} /><col style={{ width: '7%' }} /><col style={{ width: '9%' }} /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /><col style={{ width: '10%' }} /></colgroup><thead><tr><th>Employee</th><th>Payroll period</th><th className="num">Working days</th><th className="num">Total hours</th><th className="num">Hourly rate</th>
        <th className="num">Basic pay</th><th className="num">Adjustments</th><th className="num">Gross</th><th className="num">Deductions</th><th className="num">Net pay</th></tr></thead>
        <tbody>
          {groupedRows(rows, groupOf, 10, (r, i) => (
            <tr key={r.id} {...rowProps(i)} onDoubleClick={() => open(Number(r.id))}>
              <td>{r.name}</td>
              <td className="nowrap">{r.period_from === r.period_to ? mdy(r.period_from) : `${mdy(r.period_from)} – ${mdy(r.period_to)}`}</td>
              <td className="num">{r.days}{r.incomplete ? <div className="small muted">{r.incomplete} incomplete</div> : null}</td>
              <td className="num">{hrs(r.minutes)}</td><td className="num nowrap">{peso(r.hourly_rate)}</td><td className="num nowrap">{peso(r.basic_pay)}</td>
              <td className="num" title={r.adjustment_note || undefined}>{r.adjustments ? peso(r.adjustments) : '—'}{r.adjustment_note && <div className="small muted">{r.adjustment_note}</div>}</td>
              <td className="num nowrap">{peso(r.gross_pay ?? r.basic_pay + r.adjustments)}</td>
              <td className="num nowrap">{r.total_deductions ? '− ' + peso(r.total_deductions) : '—'}</td>
              <td className="num nowrap"><strong>{peso(r.net_pay)}</strong></td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={10} className="empty"><strong>No payroll generated for these filters.</strong><br /><span className="small muted">Click + to generate payroll for an employee and period.</span></td></tr>}
          {!!rows.length && <tr className="fill"><td colSpan={10} /></tr>}
        </tbody>
        {!!rows.length && (() => {
          const list = picked.length ? picked : rows;
          return <FootLine cols={10} total={rows.length} selected={picked.length} right={`Total hours: ${hrs(sum(list, 'minutes'))} · Net pay: ${peso(sum(list, 'net_pay'))}`} />;
        })()}
      </table>
      {menu && (one || !menu.ids.length) && (
        <div className="ctx-menu" role="menu" style={{ left: menu.x, top: menu.y }} onContextMenu={(e) => e.preventDefault()}>
          {!menu.ids.length && <button type="button" role="menuitem" onClick={() => { setMenu(null); window.dispatchEvent(new Event(GENERATE_EVT)); }}>Generate payroll</button>}
          {!menu.ids.length && <SortGroupItems sg={SG} done={() => setMenu(null)} />}
          {one && <>
            <button type="button" role="menuitem" onClick={() => open(Number(one.id))}>Generate payslip</button>
            <button type="button" role="menuitem" className="danger" onClick={() => remove(one)}>Delete</button>
          </>}
        </div>
      )}
      {selBox}
    </div>
  );
}
