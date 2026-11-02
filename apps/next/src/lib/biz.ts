// Business rules: settings, audit, booking money, finance totals, attendance calculations. Server-only.
import 'server-only';
import { cache } from 'react';
import { db } from './db';
import * as U from './util';
import type { Row } from './types';
import type { SessionUser } from './auth';

export * from './types'; // STATUSES, SERVICE_TYPES, METHODS, ... are re-exported for convenience

// ---------- settings ----------
export interface Settings extends Record<string, any> { // eslint-disable-line @typescript-eslint/no-explicit-any
  business_name: string; tagline: string; phones: string;
  fareList: { route: string; from: string; to: string; cents: number }[];
  whyList: { t: string; d: string }[];
  partnerList: string[];
}
export const settings = cache(async (): Promise<Settings> => {
  const s: Row = Object.fromEntries((await db.all('SELECT k,v FROM settings WHERE k NOT LIKE \'\\_%\'')).map((r) => [r.k, r.v ?? '']));
  s.phones = [s.phone, s.mobile].filter(Boolean).join(' · ');
  const lines = (t: string) => String(t || '').split('\n').map((l) => l.trim()).filter(Boolean);
  s.fareList = lines(s.fares).map((l) => {
    const [route, amt] = l.split('|').map((x) => x.trim());
    const [from, to] = route.split(/\s+to\s+/i);
    return { route, from: from || '', to: to || '', cents: U.toCents(amt) };
  }).filter((f) => Number.isFinite(f.cents));
  s.whyList = lines(s.why).map((l) => { const [t, d] = l.split('|'); return { t: (t || '').trim(), d: (d || '').trim() }; });
  s.partnerList = String(s.partners || '').split(',').map((x) => x.trim()).filter(Boolean);
  return s as Settings;
});

// ---------- audit ----------
export async function audit(who: { user?: Pick<SessionUser, 'id' | 'username'> | null; ip?: string | null } | null, action: string, entity: string | null, entityId: unknown, detail?: unknown) {
  const u = who?.user;
  await db.run('INSERT INTO audit_logs (at,user_id,username,action,entity,entity_id,detail,ip) VALUES (?,?,?,?,?,?,?,?)',
    [U.now(), u ? u.id : null, u ? u.username : null, action, entity, entityId == null ? null : String(entityId),
      typeof detail === 'string' ? detail : JSON.stringify(detail ?? {}), who?.ip ?? null]);
}

// ---------- attendance ----------
export function schedFor(u: Row) {
  return { start: u.sched_start as string, end: u.sched_end as string, grace: u.grace_min as number, brk: u.break_min as number, days: String(u.workdays).split(',').filter(Boolean).map(Number) };
}

/** Late = time-in later than scheduled start + grace period. */
export function lateInfo(u: Row, timeIn: string) {
  const s = schedFor(u);
  const over = U.tmins(timeIn) - U.mins(s.start);
  return over > s.grace ? { is_late: 1, late_min: over } : { is_late: 0, late_min: 0 };
}

/**
 * Worked minutes. The break is unpaid: the recorded break (break-out to break-in) is deducted. Older records with no recorded
 * break keep the previous rule: the scheduled break is deducted only when the shift spans longer than the break + 1h.
 */
export function workedMin(u: Row, r: Row | null | undefined) {
  if (!r || !r.time_in || !r.time_out) return 0;
  const span = U.diffMin(r.time_in, r.time_out);
  if (span <= 0) return 0;
  if (r.break_out && r.break_in) return Math.max(0, span - Math.max(0, U.diffMin(r.break_out, r.break_in)));
  return Math.max(0, span - (span > u.break_min + 60 ? u.break_min : 0));
}

/** Where a day's record is in the Time In -> Break Out -> Break In -> Time Out sequence. */
export type AttStage = 'none' | 'in' | 'break' | 'back' | 'done';
export const attStage = (r: Row | null | undefined): AttStage =>
  !r || !r.time_in ? 'none' : r.time_out ? 'done' : r.break_in ? 'back' : r.break_out ? 'break' : 'in';
/** What is still missing on an unfinished record (shown wherever a record is flagged Incomplete). */
export const attIssue = (r: Row | null | undefined) => {
  const s = attStage(r);
  return s === 'in' ? 'No break-out, break-in or time-out' : s === 'break' ? 'On break: no break-in or time-out' : s === 'back' ? 'No time-out' : '';
};

export interface DayRow { day: string; rec: Row | null; scheduled: boolean; mins: number; status: string; late: boolean; late_min: number; stage: AttStage; issue: string }

/** Per-day attendance status list for one employee between two dates (inclusive), up to today. */
export async function daily(u: Row, from: string, to: string): Promise<DayRow[]> {
  const nowStr = U.now(), today = nowStr.slice(0, 10), s = schedFor(u);
  const recs = Object.fromEntries((await db.all('SELECT * FROM attendance WHERE user_id=? AND day BETWEEN ? AND ?', [u.id, from, to])).map((r) => [r.day, r]));
  const lv = await db.all('SELECT * FROM leaves WHERE (user_id=? OR user_id IS NULL) AND day BETWEEN ? AND ?', [u.id, from, to]);
  const hol = new Set(lv.filter((l) => l.kind === 'Holiday').map((l) => l.day));
  const leave = new Set(lv.filter((l) => l.kind === 'Leave').map((l) => l.day));
  const startDay = String(u.created_at).slice(0, 10);
  const out: DayRow[] = [];
  for (let d = from; d <= to; d = U.addDays(d, 1)) {
    if (d > today) break;
    const r = recs[d];
    const row: DayRow = { day: d, rec: r || null, scheduled: s.days.includes(U.dow(d)), mins: workedMin(u, r), status: '', late: !!(r && r.is_late), late_min: r ? r.late_min : 0, stage: attStage(r), issue: '' };
    if (r && r.time_in) {
      row.status = !r.time_out && (d < today || nowStr.slice(11, 16) > s.end) ? 'Incomplete' : !r.time_out ? 'Clocked in' : r.is_late ? 'Late' : 'Present';
      if (!r.time_out) row.issue = attIssue(r); // never auto-completed: a missed step stays visible until corrected
    } else if (hol.has(d)) row.status = 'Holiday';
    else if (leave.has(d)) row.status = 'Approved leave';
    else if (!row.scheduled) row.status = 'Rest day';
    else if (d < startDay) row.status = 'Not employed';
    else if (d < today || nowStr.slice(11, 16) > s.end) row.status = 'Absent'; // cutoff = scheduled end of shift
    else row.status = 'Pending';
    out.push(row);
  }
  return out;
}

export function summarize(u: Row, rows: DayRow[]) {
  const att = rows.filter((r) => r.rec && r.rec.time_in);
  const sched = rows.filter((r) => r.scheduled && !['Holiday', 'Approved leave', 'Not employed'].includes(r.status) && r.status !== 'Pending');
  const mins = rows.reduce((a, r) => a + r.mins, 0);
  const days = att.length, absent = rows.filter((r) => r.status === 'Absent').length;
  const expected = sched.length;
  return {
    user: u, scheduled: expected, days, absent, leave: rows.filter((r) => r.status === 'Approved leave').length,
    holidays: rows.filter((r) => r.status === 'Holiday').length, late: att.filter((r) => r.rec!.is_late).length,
    incomplete: rows.filter((r) => r.status === 'Incomplete').length, mins,
    avg: days ? mins / days : 0,
    pct: expected ? Math.min(100, Math.round((rows.filter((r) => r.scheduled && r.rec && r.rec.time_in).length / expected) * 1000) / 10) : 0,
  };
}
