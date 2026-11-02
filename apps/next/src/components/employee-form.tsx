'use client';
import Link from 'next/link';
import { ApiForm, Field, Submit } from './form';

export interface EmployeeFormValues {
  id?: number; first_name?: string; last_name?: string; email?: string; role: string; designation?: string; active: number; can_expenses?: number; can_messages?: number;
}

export const NEW_USER: EmployeeFormValues = { role: 'employee', active: 1 };

/**
 * Add / edit user form: account details only. New users are Admin or Staff (there is a single owner, whose role cannot
 * change and who stays active). Work schedules and attendance rules are not edited here (new users get the database
 * defaults). Full page, or (with `onClose`) the body of the User Management dialog: no card, Cancel closes, a successful
 * save closes and refreshes the list.
 */
export function EmployeeForm({ e, isNew, onClose }: { e: EmployeeFormValues; isNew: boolean; onClose?: () => void }) {
  const owner = e.role === 'owner';
  return (
    <ApiForm action={isNew ? '/api/employees' : `/api/employees/${e.id}`} redirect="/app/employees" stay={!!onClose} className={onClose ? undefined : 'card'} style={onClose ? undefined : { maxWidth: 760 }}
      reset={isNew && !!onClose} onDone={(d) => { if (d.ok) onClose?.(); }}>
      <div className="grid g2">
        <Field name="first_name" label="First name *" defaultValue={e.first_name} attrs={{ required: true, maxLength: 60, autoComplete: 'off' }} />
        <Field name="last_name" label="Last name *" defaultValue={e.last_name} attrs={{ required: true, maxLength: 60, autoComplete: 'off' }} />
        {owner
          ? <div className="field"><label>Role</label><input value="Owner" disabled readOnly /><div className="small muted">There is only one owner; this role cannot be changed.</div></div>
          : <Field name="role" label="Role *" type="select" emptyLabel={null} defaultValue={e.role} options={[['employee', 'Staff'], ['admin', 'Admin']]}
              hint="Admins have the same access as the owner." />}
        <Field name="designation" label="Designation" defaultValue={e.designation} hint="Job title, e.g. Ticketing Officer." attrs={{ maxLength: 80 }} />
        <Field name="email" label="Email (used to log in) *" type="email" defaultValue={e.email} attrs={{ required: true, maxLength: 160, autoComplete: "off" }} />
        {isNew
          ? <div className="field"><label>Initial password</label><div className="small muted">New accounts start with the password <strong>Alchemist1</strong>. The user must change it at first login.</div></div>
          : <Field name="password" label="Reset password (leave blank to keep)" type="password" attrs={{ autoComplete: 'new-password', minLength: 8 }}
              hint="Min 8 characters, first letter capital, with a number. The user must change it at next login." />}
      </div>
      {!owner && (
        <div style={{ marginBottom: 14 }}>
          <div className="small" style={{ fontWeight: 600, marginBottom: 6 }}>Module access (staff only)</div>
          <label className="small" style={{ display: 'block', marginBottom: 6 }}>
            <input type="checkbox" name="can_expenses" defaultChecked={!!e.can_expenses} /> Allow access to Monitoring Finances
          </label>
          <label className="small" style={{ display: 'block' }}>
            <input type="checkbox" name="can_messages" defaultChecked={!!e.can_messages} /> Allow access to Messages
          </label>
          <span className="small muted" style={{ display: 'block', marginTop: 4 }}>Admins and the owner always have access.</span>
        </div>
      )}
      <div className="row"><Submit>{isNew ? 'Add user' : 'Save'}</Submit> {onClose
        ? <button type="button" className="btn ghost" onClick={onClose}>Cancel</button>
        : <Link className="btn ghost" href="/app/employees">Cancel</Link>}</div>
    </ApiForm>
  );
}
