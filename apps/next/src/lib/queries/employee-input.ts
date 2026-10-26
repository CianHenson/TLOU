// User form parsing/validation shared by POST /api/employees and /api/employees/[id]: account details only (work schedule
// and attendance rules are not part of User Management; new users get the column defaults).
// `name` (shown everywhere) is built from first + last name. Only Admin or Staff can be chosen; there is a single owner.
import 'server-only';
import { str } from '../util';
import { strongEnough } from '../password';

export function employeeInput(b: Record<string, FormDataEntryValue | undefined>, isNew: boolean) {
  const first_name = str(b.first_name, 60), last_name = str(b.last_name, 60);
  const e = {
    first_name, last_name, name: `${first_name} ${last_name}`.trim().slice(0, 120),
    email: str(b.email, 160), username: str(b.username, 40).toLowerCase(), role: b.role === 'admin' ? 'admin' : 'employee', designation: str(b.designation, 80),
    active: b.active === 'on' ? 1 : 0, can_expenses: b.can_expenses === 'on' ? 1 : 0,
  };
  const errors: Record<string, string> = {};
  const pw = String(b.password ?? '');
  if (!e.first_name) errors.first_name = 'Required.';
  if (!e.last_name) errors.last_name = 'Required.';
  if (!/^[a-z0-9._-]{3,40}$/.test(e.username)) errors.username = '3–40 letters, numbers, dot, dash or underscore.';
  if ((isNew || pw) && !strongEnough(pw)) errors.password = 'At least 10 characters with letters and numbers.';
  return { e, errors, pw };
}
