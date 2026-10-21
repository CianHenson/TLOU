import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, get } from '../../../lib/api';
import { useFlash } from '../../../lib/flash';
import { useForm } from '../../../lib/form';
import { usePageTitle } from '../../../lib/title';
import Field from '../../../ui/Field';
import { DOW, type PublicUser } from './shared';

const BLANK = {
  name: '', email: '', username: '', password: '', role: 'employee', active: true, can_expenses: false,
  sched_start: '08:00', sched_end: '17:00', grace_min: '10', break_min: '60', workdays: [1, 2, 3, 4, 5] as number[],
};

export default function EmployeeForm() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const qc = useQueryClient();
  const flash = useFlash();
  const f = useForm<typeof BLANK>(BLANK);
  const [busy, setBusy] = useState(false);

  const { data: existing } = useQuery({ queryKey: ['employee', id], queryFn: () => get<PublicUser>(`/employees/${id}`), enabled: !isNew });
  usePageTitle(isNew ? 'New employee' : existing?.name ?? 'Employee');

  useEffect(() => {
    if (!existing) return;
    f.setV({
      name: existing.name, email: existing.email ?? '', username: existing.username, password: '', role: existing.role,
      active: !!existing.active, can_expenses: !!existing.can_expenses, sched_start: existing.sched_start, sched_end: existing.sched_end,
      grace_min: String(existing.grace_min), break_min: String(existing.break_min),
      workdays: String(existing.workdays || '').split(',').filter(Boolean).map(Number),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [existing]);

  const toggleDay = (d: number) =>
    f.setV((p) => ({ ...p, workdays: p.workdays.includes(d) ? p.workdays.filter((x) => x !== d) : [...p.workdays, d].sort() }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    f.reset();
    setBusy(true);
    try {
      const body = { ...f.v, ...(f.v.password ? {} : { password: undefined }) };
      await api(isNew ? '/employees' : `/employees/${id}`, { method: isNew ? 'POST' : 'PUT', body: JSON.stringify(body) });
      flash.ok(isNew ? 'Employee created. They must change the password at first login.' : 'Employee saved.');
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employee'] });
      nav('/app/employees');
    } catch (err) {
      f.fail(err);
    } finally {
      setBusy(false);
    }
  };

  if (!isNew && !existing) return <p className="muted">Loading…</p>;
  return (
    <form className="card" style={{ maxWidth: 760 }} onSubmit={submit} noValidate autoComplete="off">
      {f.message && Object.keys(f.errors).length === 0 && <div className="flash err" role="alert">{f.message}</div>}
      <h3>Account</h3>
      <div className="grid g2">
        <Field label="Full name *" required maxLength={120} {...f.bind('name')} />
        <Field label="Email" type="email" {...f.bind('email')} />
        <Field label="Username *" required maxLength={40} {...f.bind('username')} />
        <Field
          label={isNew ? 'Initial password *' : 'Reset password (leave blank to keep)'} type="password" autoComplete="new-password"
          hint="Min 10 characters with letters and numbers. The employee must change it at first login." {...f.bind('password')}
        />
        <Field label="Role" type="select" options={[{ value: 'employee', label: 'Employee' }, { value: 'owner', label: 'Owner / Administrator' }]} {...f.bind('role')} />
        <div className="field"><label>Permissions</label>
          <label style={{ fontWeight: 400 }}>
            <input type="checkbox" checked={f.v.can_expenses} onChange={(e) => f.setV((p) => ({ ...p, can_expenses: e.target.checked }))} /> Can record/view business expenses
          </label>
          <label style={{ fontWeight: 400 }}>
            <input type="checkbox" checked={f.v.active} onChange={(e) => f.setV((p) => ({ ...p, active: e.target.checked }))} /> Account active
          </label>
        </div>
      </div>
      <h3>Work schedule &amp; attendance rules</h3>
      <div className="grid g4">
        <Field label="Shift start" type="time" {...f.bind('sched_start')} />
        <Field label="Shift end" type="time" {...f.bind('sched_end')} />
        <Field label="Grace period (min)" type="number" min={0} max={120} {...f.bind('grace_min')} />
        <Field label="Unpaid break (min)" type="number" min={0} max={240} {...f.bind('break_min')} />
      </div>
      <div className="field"><label>Workdays</label><div className="row">
        {DOW.map((d, i) => (
          <label key={d} style={{ fontWeight: 400 }}>
            <input type="checkbox" checked={f.v.workdays.includes(i)} onChange={() => toggleDay(i)} /> {d}
          </label>
        ))}
      </div></div>
      <p className="small muted">Late = time-in after shift start + grace period. Absent = scheduled workday ended with no attendance, leave or holiday. Changes apply to future calculations of the displayed reports.</p>
      <button className="btn" disabled={busy}>{busy ? <><span className="spin" />Please wait…</> : 'Save'}</button>{' '}
      <Link className="btn ghost" to="/app/employees">Cancel</Link>
    </form>
  );
}
