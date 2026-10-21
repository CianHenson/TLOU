import {
  BadRequestException, Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Query, Req, Res, UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { sendCsv } from '../common/http';
import { addDays, hrs, monthRange, now, str, today, validDate } from '../common/util';
import { actorOf, AuthGuard, AuthUser, CurrentUser, Roles } from '../auth/auth.guard';
import { BizService } from '../data/biz.service';
import { AttendanceRepository, CorrectionsRepository, LeavesRepository, UsersRepository } from '../data/repositories';
import { hm, monthsBack, publicUser, safeSummary } from './people.util';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const MONTH = /^\d{4}-\d{2}$/;

@Controller('attendance')
@UseGuards(AuthGuard)
export class AttendanceController {
  constructor(
    private biz: BizService,
    private users: UsersRepository,
    private attendance: AttendanceRepository,
    private leaves: LeavesRepository,
    private corrections: CorrectionsRepository,
  ) {}

  // ---------------- my attendance (all staff) ----------------
  @Get('me')
  me(@CurrentUser() user: AuthUser, @Query('month') month?: string) {
    const u = this.users.findById(user.id)!;
    const t = today();
    const ym = MONTH.test(month ?? '') ? month! : t.slice(0, 7);
    const [from, to] = monthRange(ym);
    const rows = this.biz.daily(u, from, to).reverse();
    const rec = this.attendance.findOne((r) => r.user_id === u.id && r.day === t) ?? null;
    return {
      name: u.name, rec, rows, ym, sum: safeSummary(this.biz.summarize(u, rows)),
      todayMins: this.biz.workedMin(u, rec), sched: this.biz.schedFor(u), nowStr: now(),
    };
  }

  @Post('in')
  timeIn(@CurrentUser() user: AuthUser, @Req() req: Request) {
    const u = this.users.findById(user.id)!;
    const n = now();
    const day = n.slice(0, 10);
    if (this.attendance.findOne((r) => r.user_id === u.id && r.day === day)) throw new BadRequestException('You have already timed in today.');
    const late = this.biz.lateInfo(u, n);
    const rec = this.attendance.create({ user_id: u.id, day, time_in: n, time_out: null, is_late: late.is_late, late_min: late.late_min });
    this.biz.audit(actorOf(user), 'attendance.in', 'attendance', rec.id, n, req.ip ?? null);
    return { message: `Time-in recorded at ${n.slice(11, 16)}${late.is_late ? ` — marked late by ${late.late_min} min` : ' — on time'}.` };
  }

  @Post('out')
  timeOut(@CurrentUser() user: AuthUser, @Req() req: Request) {
    const n = now();
    const rec = this.attendance.findOne((r) => r.user_id === user.id && r.day === n.slice(0, 10));
    if (!rec || !rec.time_in) throw new BadRequestException('No open attendance record — time in first.');
    if (rec.time_out) throw new BadRequestException('You have already timed out today.');
    this.attendance.update(rec.id, { time_out: n });
    this.biz.audit(actorOf(user), 'attendance.out', 'attendance', rec.id, n, req.ip ?? null);
    return { message: `Time-out recorded at ${n.slice(11, 16)}.` };
  }

  // ---------------- attendance monitoring (owner) ----------------
  @Get('monitor')
  @Roles('owner')
  monitor(@Query() q: Record<string, string>, @Res() res: Response) {
    const t = today();
    const day = validDate(q.day) ? q.day : t;
    const rows = this.biz.activeStaff().map((u) => ({
      u: publicUser(u), d: this.biz.daily(u, day, day)[0] ?? { status: 'Future', rec: null, mins: 0, late_min: 0 },
    }));
    if (q.export === 'csv') {
      return sendCsv(res, 'attendance-' + day, ['Emp No', 'Employee', 'Date', 'Status', 'Time in', 'Time out', 'Late (min)', 'Hours'],
        rows.map(({ u, d }) => [u.emp_no, u.name, day, d.status, hm(d.rec?.time_in), hm(d.rec?.time_out), d.late_min, hrs(d.mins)]));
    }
    const names = new Map(this.users.findAll().map((u) => [u.id, u.name]));
    const leaves = this.leaves.find((l) => l.day >= addDays(t, -30)).sort((a, b) => a.day.localeCompare(b.day)).slice(0, 50)
      .map((l) => ({ ...l, name: l.user_id ? names.get(l.user_id) ?? null : null }));
    return res.json({ day, rows, leaves, staff: this.biz.activeStaff().map((u) => ({ id: u.id, name: u.name })), nowStr: now(), today: t });
  }

  @Post('leave')
  @Roles('owner')
  addLeave(@Body() b: Record<string, any>, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const day = str(b.day, 10);
    const kind = b.kind === 'Holiday' ? 'Holiday' : 'Leave';
    const uid = /^\d+$/.test(String(b.user_id ?? '')) ? Number(b.user_id) : null;
    if (!validDate(day)) throw new BadRequestException('Enter a valid date.');
    if (kind === 'Leave' && !uid) throw new BadRequestException('Choose the employee on leave.');
    const userId = kind === 'Holiday' ? null : uid;
    if (this.leaves.findOne((l) => l.user_id === userId && l.day === day && l.kind === kind)) throw new BadRequestException('That entry already exists.');
    const l = this.leaves.create({ user_id: userId, day, kind, note: str(b.note, 200) });
    this.biz.audit(actorOf(user), 'leave.add', 'leave', l.id, { day, kind, uid }, req.ip ?? null);
    return { message: `${kind} recorded.` };
  }

  @Delete('leave/:id')
  @Roles('owner')
  removeLeave(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const l = this.leaves.findById(id);
    if (l) {
      this.leaves.remove(l.id);
      this.biz.audit(actorOf(user), 'leave.remove', 'leave', l.id, l, req.ip ?? null);
    }
    return { ok: true };
  }

  // Correct a record: original values are preserved in attendance_corrections with the mandatory reason.
  @Post('correct')
  @Roles('owner')
  correct(@Body() b: Record<string, any>, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const uid = Number(b.user_id);
    const day = str(b.day, 10);
    const reason = str(b.reason, 500);
    const u = this.users.findById(uid);
    const tin = str(b.time_in, 5);
    const tout = str(b.time_out, 5);
    if (!u || !validDate(day)) throw new BadRequestException('Invalid employee or date.');
    if (!reason) throw new BadRequestException('A documented reason is required for corrections.');
    if (day > today()) throw new BadRequestException('Cannot record attendance for a future date.');
    if (!TIME.test(tin) || (tout && !TIME.test(tout)) || (tout && tout <= tin)) throw new BadRequestException('Enter valid times; time-out must be after time-in.');
    const newIn = `${day} ${tin}:00`;
    const newOut = tout ? `${day} ${tout}:00` : null;
    const old = this.attendance.findOne((r) => r.user_id === uid && r.day === day);
    const late = this.biz.lateInfo(u, newIn);
    this.corrections.create({ user_id: uid, day, old_in: old?.time_in ?? null, old_out: old?.time_out ?? null, new_in: newIn, new_out: newOut, reason, by_user: user.id, at: now() });
    if (old) this.attendance.update(old.id, { time_in: newIn, time_out: newOut, is_late: late.is_late, late_min: late.late_min });
    else this.attendance.create({ user_id: uid, day, time_in: newIn, time_out: newOut, is_late: late.is_late, late_min: late.late_min });
    this.biz.audit(actorOf(user), 'attendance.correct', 'attendance', `${uid}:${day}`, { from: old ? [old.time_in, old.time_out] : null, to: [newIn, newOut], reason }, req.ip ?? null);
    return { message: 'Attendance corrected and logged.' };
  }

  // ---------------- monthly attendance reports (owner) ----------------
  @Get('report')
  @Roles('owner')
  report(@Query() q: Record<string, string>, @Res() res: Response) {
    const ym = MONTH.test(q.month ?? '') ? q.month : today().slice(0, 7);
    const uid = /^\d+$/.test(q.employee ?? '') ? Number(q.employee) : null;
    const withRecords = new Set(this.attendance.findAll().map((r) => r.user_id));
    const all = this.users.find((u) => u.active === 1 || withRecords.has(u.id)).sort((a, b) => a.name.localeCompare(b.name));
    const users = uid ? all.filter((u) => u.id === uid) : all;
    const [from, to] = monthRange(ym);
    const detail = users.map((u) => ({ u, rows: this.biz.daily(u, from, to) }));
    const sums = detail.map((d) => this.biz.summarize(d.u, d.rows));

    if (q.export === 'csv') {
      if (q.detail) {
        return sendCsv(res, `attendance-detail-${ym}`, ['Emp No', 'Employee', 'Date', 'Status', 'Time in', 'Time out', 'Late (min)', 'Hours'],
          detail.flatMap((d) => d.rows.map((r) => [d.u.emp_no, d.u.name, r.day, r.status, hm(r.rec?.time_in), hm(r.rec?.time_out), r.late_min, hrs(r.mins)])));
      }
      return sendCsv(res, `attendance-summary-${ym}`,
        ['Emp No', 'Employee', 'Month', 'Scheduled days', 'Days attended', 'Absences', 'Approved leave', 'Late arrivals', 'Incomplete', 'Total hours', 'Avg hours/day', 'Attendance %'],
        sums.map((s) => [s.user.emp_no, s.user.name, ym, s.scheduled, s.days, s.absent, s.leave, s.late, s.incomplete, hrs(s.mins), hrs(s.avg), s.pct]));
    }

    const prev = monthsBack(ym + '-01', 4).slice(0, 3);
    const compare = users.map((u) => ({
      u: publicUser(u),
      months: prev.map((m) => {
        const [a, z] = monthRange(m);
        const s = this.biz.summarize(u, this.biz.daily(u, a, z));
        return { m, pct: s.pct, late: s.late, absent: s.absent, hrs: s.mins };
      }),
    }));
    const names = new Map(this.users.findAll().map((u) => [u.id, u.name]));
    const corr = this.corrections.find((c) => c.day.slice(0, 7) === ym && (!uid || c.user_id === uid)).sort((a, b) => b.id - a.id)
      .map((c) => ({ ...c, who: names.get(c.user_id), by_name: names.get(c.by_user) }));
    return res.json({
      ym, uid, all: all.map((u) => ({ id: u.id, name: u.name })),
      detail: detail.map((d) => ({ u: publicUser(d.u), rows: d.rows })), sums: sums.map(safeSummary), compare, prev, corr,
    });
  }
}
