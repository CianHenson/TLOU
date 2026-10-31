// Time In -> Break Out -> Break In -> Time Out. Each step is enforced here, in one conditional UPDATE, so a step can only be
// recorded once and only after the previous one - hiding or disabling the buttons is just a convenience for the user.
import 'server-only';
import { db } from '../db';
import { audit, attStage } from '../biz';
import { fail, ok, clientIp } from '../http';
import { hm12, now } from '../util';
import { employeeOf } from './payroll';
import type { SessionUser } from '../auth';

type Step = 'break_out' | 'break_in' | 'time_out';
const STEPS: Record<Step, { from: string; sets: string; where: string; done: string; label: string; msg: (t: string) => string }> = {
  break_out: { from: 'in', sets: 'break_out', where: 'time_in IS NOT NULL AND break_out IS NULL AND time_out IS NULL', done: 'attendance.break_out', label: 'Break out',
    msg: (t) => `Break started at ${t}.` },
  break_in: { from: 'break', sets: 'break_in', where: 'break_out IS NOT NULL AND break_in IS NULL AND time_out IS NULL', done: 'attendance.break_in', label: 'Break in',
    msg: (t) => `Back from break at ${t}.` },
  time_out: { from: 'back', sets: 'time_out', where: 'break_in IS NOT NULL AND time_out IS NULL', done: 'attendance.out', label: 'Time out',
    msg: (t) => `Time-out recorded at ${t}. Your attendance for today is complete.` },
};

/** Staff need an active employee record (owners / admins may clock but are never counted in attendance or payroll). */
export async function canClock(user: SessionUser) {
  return user.role !== 'employee' || !!(await employeeOf(user.id));
}

/** Records one step for today using the server clock. Returns the JSON response for the route. */
export async function clockStep(req: Request, user: SessionUser, step: Step) {
  if (!(await canClock(user))) return fail('Your attendance is not active. Please ask the owner or an admin.');
  const n = now(), day = n.slice(0, 10), S = STEPS[step];
  const r = await db.run(`UPDATE attendance SET ${S.sets}=? WHERE user_id=? AND day=? AND ${S.where}`, [n, user.id, day]);
  if (!r.affected) {
    const rec = await db.get('SELECT * FROM attendance WHERE user_id=? AND day=?', [user.id, day]);
    const st = attStage(rec);
    if (st === 'none') return fail('Time in first.');
    if (st === 'done') return fail('You have already timed out today. Your attendance is complete.');
    if (step === 'time_out' && st !== 'back') return fail(st === 'in' ? 'Take your break first: Break Out, then Break In, then Time Out.' : 'End your break (Break In) before timing out.');
    if (step === 'break_out') return fail(st === 'in' ? 'Break out could not be recorded.' : 'You have already taken your break today.');
    return fail(st === 'in' ? 'Break out first.' : 'You have already ended your break.');
  }
  const rec = await db.get('SELECT id FROM attendance WHERE user_id=? AND day=?', [user.id, day]);
  await audit({ user, ip: clientIp(req) }, S.done, 'attendance', rec?.id, n);
  return ok(S.msg(hm12(n)));
}
