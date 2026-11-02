// Time In -> Break Out -> Break In -> Time Out. Each step is enforced here, in one conditional UPDATE, so a step can only be
// recorded once and only after the previous one - hiding or disabling the buttons is just a convenience for the user.
import 'server-only';
import { db } from '../db';
import { audit, attStage, settings } from '../biz';
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

/** Staff need an active employee record (the owner and admins may clock; they are counted in attendance and payroll only once added as employees). */
export async function canClock(user: SessionUser) {
  return user.role !== 'employee' || !!(await employeeOf(user.id));
}

const MAX_ACCURACY_M = 100; // a reading less precise than this cannot prove the person is at the office

/** Great-circle distance in metres between two coordinates (haversine). */
function distanceM(lat1: number, lng1: number, lat2: number, lng2: number) {
  const r = Math.PI / 180, a = Math.sin(((lat2 - lat1) * r) / 2) ** 2 + Math.cos(lat1 * r) * Math.cos(lat2 * r) * Math.sin(((lng2 - lng1) * r) / 2) ** 2;
  return 2 * 6371000 * Math.asin(Math.sqrt(a));
}

/**
 * Time In only: the device location sent by the browser must be within the allowed radius of the office (System Settings).
 * Blank office coordinates turn the check off. Returns an error message, or the location to save with the time-in.
 */
export async function checkOffice(b: Record<string, unknown>): Promise<{ error: string } | { lat: number; lng: number; dist: number } | null> {
  const S = await settings();
  const oLat = parseFloat(String(S.office_lat ?? '')), oLng = parseFloat(String(S.office_lng ?? ''));
  if (!Number.isFinite(oLat) || !Number.isFinite(oLng)) return null;
  const radius = Math.max(10, parseFloat(String(S.office_radius ?? '')) || 150);
  const lat = parseFloat(String(b.lat ?? '')), lng = parseFloat(String(b.lng ?? '')), acc = parseFloat(String(b.acc ?? ''));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
    return { error: 'Location is required to time in. Please allow location access for this site in your browser, then try again.' };
  if (Number.isFinite(acc) && acc > MAX_ACCURACY_M)
    return { error: `Your device location is not accurate enough (±${Math.round(acc)} m). Turn on GPS / precise location and try again.` };
  const dist = Math.round(distanceM(lat, lng, oLat, oLng));
  if (dist > radius) return { error: `You can only time in within the allowed radius of your office location (${Math.round(radius)} m). You are currently about ${dist} m away.` };
  return { lat, lng, dist };
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
