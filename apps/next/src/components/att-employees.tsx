'use client';
// Attendance Monitoring → Employees: assign registered Staff accounts as employees (with an hourly rate), edit the rate
// and work schedule, deactivate / reactivate. Same row selection and right-click menus as the other tables.
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { hrs, peso } from '@/lib/util';
import { WEEKDAYS, type Row } from '@/lib/types';
import { ApiForm, Field, Submit } from './form';
import { moneyInput } from './input-format';
import { useRowSelection } from './row-select';
import { FootLine } from './ui';
import { Modal, PlusButton, usePost } from './modal';

const ADD_EVT = 'employee:add';
const money = (c: number) => (c / 100).toFixed(2);

/** "+" header button: pick a registered Staff user and set their hourly rate. Also opens on the table's empty-space menu. */
export function AddEmployeeButton({ users }: { users: Row[] }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener(ADD_EVT, on);
    return () => window.removeEventListener(ADD_EVT, on);
  }, []);
  return (
    <>
      <PlusButton label="Add employee" onClick={() => setOpen(true)} />
      {open && (
        <Modal title="Add employee" onClose={() => setOpen(false)}>
          {(close) => users.length ? (
            <ApiForm action="/api/attendance-monitor/employees" stay onDone={(d) => { if (d.ok) close(); }}>
              <p className="small muted" style={{ marginTop: 0 }}>Choose a registered Staff account. Their name and login stay in User Management; here you only set attendance and pay.</p>
              <Field name="user_id" label="Registered user *" type="select" emptyLabel="— Choose a user —" options={users.map((u) => [u.id, `${u.name} (${u.email})${u.designation ? ` · ${u.designation}` : ''}`])} attrs={{ required: true }} />
              <Field name="hourly_rate" label="Hourly rate (₱) *" attrs={{ inputMode: 'decimal', placeholder: '0.00', required: true, onInput: moneyInput }} hint="Used for payroll: total hours worked × hourly rate." />
              <p className="small muted">New employees start on the default schedule (08:00–17:00, Mon–Fri). Change it with right-click → Edit.</p>
              <div className="row"><Submit>Add employee</Submit> <button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
            </ApiForm>
          ) : (
            <div className="empty-state">
              <p><strong>No registered users to add.</strong></p>
              <p className="small muted">Every active Staff account is already an employee. Create the account in User Management first; owner and admin accounts are never employees.</p>
              <button type="button" className="btn ghost" onClick={close}>Close</button>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

function EditEmployee({ e, onClose }: { e: Row; onClose: () => void }) {
  const days = String(e.workdays || '').split(',');
  return (
    <Modal title={`Edit employee — ${e.name}`} onClose={onClose} width={720}>
      {(close) => (
        <ApiForm action={`/api/attendance-monitor/employees/${e.employee_id}`} stay onDone={(d) => { if (d.ok) close(); }}>
          <h3 style={{ marginTop: 0 }}>Pay</h3>
          <Field name="hourly_rate" label="Hourly rate (₱) *" defaultValue={money(e.hourly_rate)} attrs={{ inputMode: 'decimal', required: true, onInput: moneyInput }}
            hint="Applies to payroll generated from now on; payroll already generated keeps its rate." />
          <h3>Work schedule &amp; attendance rules</h3>
          <div className="grid g4">
            <Field name="sched_start" label="Shift start" type="time" defaultValue={e.sched_start} />
            <Field name="sched_end" label="Shift end" type="time" defaultValue={e.sched_end} />
            <Field name="grace_min" label="Grace period (min)" type="number" defaultValue={e.grace_min} attrs={{ min: 0, max: 120 }} />
            <Field name="break_min" label="Unpaid break (min)" type="number" defaultValue={e.break_min} attrs={{ min: 0, max: 240 }} />
          </div>
          <div className="field"><label>Workdays</label><div className="row">
            {WEEKDAYS.map((d, i) => <label key={d} style={{ fontWeight: 400 }}><input type="checkbox" name="workdays" value={i} defaultChecked={days.includes(String(i))} /> {d}</label>)}</div></div>
          <p className="small muted">Late = time-in after shift start + grace period. Absent = a scheduled workday that ended with no attendance, leave or holiday. Hours worked = time-out − time-in, minus the unpaid break on shifts longer than the break + 1 hour.</p>
          <div className="row"><Submit>Save</Submit> <button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
        </ApiForm>
      )}
    </Modal>
  );
}

/** Employee list. `days` / `minutes` are this month's working days and hours. */
export function EmployeeTable({ rows, monthLabel, month, searching = false }: { rows: Row[]; monthLabel: string; month: [string, string]; searching?: boolean }) {
  const router = useRouter();
  const { post } = usePost();
  const { wrap, sel, setSel, menu, setMenu, rowProps, selBox, emptyMenu } = useRowSelection(rows.map((r) => Number(r.employee_id)), 150);
  const [editing, setEditing] = useState<Row | null>(null);
  const pick = (id: number) => rows.find((r) => Number(r.employee_id) === id);
  const edit = (id: number) => { setMenu(null); setEditing(pick(id) ?? null); };
  const toggle = async (r: Row) => {
    setMenu(null);
    if (r.active && !window.confirm(`Deactivate ${r.name}? Their attendance and payroll history is kept, but they can no longer time in and are left out of new payroll.`)) return;
    const d = await post(`/api/attendance-monitor/employees/${r.employee_id}/status`, { active: r.active ? '0' : '1' });
    if (d.ok) setSel(new Set());
  };
  const one = menu && menu.ids.length === 1 ? pick(menu.ids[0]) : undefined;
  return (
    <div className="tw tw-fixed tw-fm tw-sel" ref={wrap} onContextMenu={emptyMenu}>
      <table><thead><tr><th>Name</th><th>Designation</th><th>Schedule</th><th className="num">Hourly rate</th><th>Status</th>
        <th className="num">Working days <span className="muted small">({monthLabel})</span></th><th className="num">Hours <span className="muted small">({monthLabel})</span></th></tr></thead>
        <tbody>
          {rows.map((e, i) => (
            <tr key={e.employee_id} {...rowProps(i, e.active ? '' : 'off')} onDoubleClick={() => edit(Number(e.employee_id))}>
              <td>{e.name}<div className="small muted">{e.email}</div></td><td>{e.designation || '—'}</td>
              <td className="nowrap">{e.sched_start}–{e.sched_end}<div className="small muted">{String(e.workdays).split(',').filter(Boolean).map((d) => WEEKDAYS[Number(d)]).join(', ')}</div></td>
              <td className="num">{e.hourly_rate ? peso(e.hourly_rate) : <span className="badge b-warn">Not set</span>}</td>
              <td><span className={`badge ${e.active && e.user_active ? 'b-ok' : 'b-err'}`}>{e.active ? (e.user_active ? 'Active' : 'Account off') : 'Deactivated'}</span></td>
              <td className="num">{e.days}</td><td className="num">{hrs(e.minutes)}</td>
            </tr>
          ))}
          {!rows.length && searching && <tr><td colSpan={7} className="empty"><strong>No employees match your search.</strong></td></tr>}
          {!rows.length && !searching && <tr><td colSpan={7} className="empty"><strong>No employees yet.</strong><br /><span className="small muted">Click + (or right-click here) to add a registered Staff user as an employee.</span></td></tr>}
          <tr className="fill"><td colSpan={7} /></tr>
        </tbody>
        {!!rows.length && <FootLine cols={7} total={rows.length} selected={sel.size} />}
      </table>
      {menu && (
        <div className="ctx-menu" role="menu" style={{ left: menu.x, top: menu.y }} onContextMenu={(e) => e.preventDefault()}>
          {!menu.ids.length && <button type="button" role="menuitem" onClick={() => { setMenu(null); window.dispatchEvent(new Event(ADD_EVT)); }}>Add employee</button>}
          {one && <>
            <button type="button" role="menuitem" onClick={() => edit(Number(one.employee_id))}>Edit rate &amp; schedule</button>
            <button type="button" role="menuitem" onClick={() => { setMenu(null); router.push(`/app/attendance-monitor?tab=attendance&uid=${one.id}&from=${month[0]}&to=${month[1]}&range=month`); }}>View attendance</button>
            <button type="button" role="menuitem" className={one.active ? 'danger' : undefined} onClick={() => toggle(one)}>{one.active ? 'Deactivate' : 'Reactivate'}</button>
          </>}
          {menu.ids.length > 1 && <button type="button" role="menuitem" onClick={() => setMenu(null)}>Select one employee to edit</button>}
        </div>
      )}
      {editing && <EditEmployee key={editing.employee_id} e={editing} onClose={() => setEditing(null)} />}
      {selBox}
    </div>
  );
}
