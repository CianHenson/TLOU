'use client';
import Link from 'next/link';
import { ApiForm, Field, Submit } from './form';
import { WEEKDAYS } from '@/lib/types';

interface E { id?: number; name?: string; email?: string; username?: string; role: string; active: number; can_expenses?: number; sched_start: string; sched_end: string; grace_min: number; break_min: number; workdays: string }

export function EmployeeForm({ e, isNew }: { e: E; isNew: boolean }) {
  const days = String(e.workdays || '').split(',');
  return (
    <ApiForm action={isNew ? '/api/employees' : `/api/employees/${e.id}`} redirect="/app/employees" className="card" style={{ maxWidth: 760 }}>
      <h3>Account</h3>
      <div className="grid g2">
        <Field name="name" label="Full name *" defaultValue={e.name} attrs={{ required: true, maxLength: 120, autoComplete: 'off' }} />
        <Field name="email" label="Email" type="email" defaultValue={e.email} attrs={{ autoComplete: 'off' }} />
        <Field name="username" label="Username *" defaultValue={e.username} attrs={{ required: true, maxLength: 40, autoComplete: 'off' }} />
        <Field name="password" label={isNew ? 'Initial password *' : 'Reset password (leave blank to keep)'} type="password" attrs={{ autoComplete: 'new-password', minLength: 10, required: isNew }}
          hint="Min 10 characters with letters and numbers. The employee must change it at first login." />
        <Field name="role" label="Role" type="select" emptyLabel={null} defaultValue={e.role} options={[['employee', 'Employee'], ['owner', 'Owner / Administrator']]} />
        <div className="field"><label>Permissions</label>
          <label style={{ fontWeight: 400 }}><input type="checkbox" name="can_expenses" defaultChecked={!!e.can_expenses} /> Can record/view business expenses</label>
          <label style={{ fontWeight: 400 }}><input type="checkbox" name="active" defaultChecked={!!e.active} /> Account active</label></div>
      </div>
      <h3>Work schedule &amp; attendance rules</h3>
      <div className="grid g4">
        <Field name="sched_start" label="Shift start" type="time" defaultValue={e.sched_start} />
        <Field name="sched_end" label="Shift end" type="time" defaultValue={e.sched_end} />
        <Field name="grace_min" label="Grace period (min)" type="number" defaultValue={e.grace_min} attrs={{ min: 0, max: 120 }} />
        <Field name="break_min" label="Unpaid break (min)" type="number" defaultValue={e.break_min} attrs={{ min: 0, max: 240 }} />
      </div>
      <div className="field"><label>Workdays</label><div className="row">
        {WEEKDAYS.map((d, i) => <label key={d} style={{ fontWeight: 400 }}><input type="checkbox" name="workdays" value={i} defaultChecked={days.includes(String(i))} /> {d}</label>)}</div></div>
      <p className="small muted">Late = time-in after shift start + grace period. Absent = scheduled workday ended with no attendance, leave or holiday. Changes apply to future calculations of the displayed reports.</p>
      <div className="row"><Submit>Save</Submit> <Link className="btn ghost" href="/app/employees">Cancel</Link></div>
    </ApiForm>
  );
}
