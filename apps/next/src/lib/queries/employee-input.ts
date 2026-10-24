// Employee form parsing/validation shared by POST /api/employees and /api/employees/[id].
import 'server-only';
import { str } from '../util';
import { strongEnough } from '../password';

export function employeeInput(b: Record<string, FormDataEntryValue | undefined>, workdays: FormDataEntryValue[], isNew: boolean) {
  const T = /^([01]\d|2[0-3]):[0-5]\d$/;
  const e = {
    name: str(b.name, 120), email: str(b.email, 160), username: str(b.username, 40).toLowerCase(), role: b.role === 'owner' ? 'owner' : 'employee',
    active: b.active === 'on' ? 1 : 0, can_expenses: b.can_expenses === 'on' ? 1 : 0, sched_start: str(b.sched_start, 5), sched_end: str(b.sched_end, 5),
    grace_min: parseInt(String(b.grace_min ?? ''), 10), break_min: parseInt(String(b.break_min ?? ''), 10),
    workdays: [...new Set(workdays.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n <= 6))].sort().join(','),
  };
  const errors: Record<string, string> = {};
  const pw = String(b.password ?? '');
  if (!e.name) errors.name = 'Required.';
  if (!/^[a-z0-9._-]{3,40}$/.test(e.username)) errors.username = '3–40 letters, numbers, dot, dash or underscore.';
  if (!T.test(e.sched_start)) errors.sched_start = 'Use HH:MM.';
  if (!T.test(e.sched_end) || e.sched_end <= e.sched_start) errors.sched_end = 'Must be after the start time.';
  if (!(e.grace_min >= 0 && e.grace_min <= 120)) errors.grace_min = '0–120 minutes.';
  if (!(e.break_min >= 0 && e.break_min <= 240)) errors.break_min = '0–240 minutes.';
  if ((isNew || pw) && !strongEnough(pw)) errors.password = 'At least 10 characters with letters and numbers.';
  return { e, errors, pw };
}
