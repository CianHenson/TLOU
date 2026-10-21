import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { hrs, monthRange, now, today } from '../common/util';
import { AuthGuard, AuthUser, CurrentUser } from '../auth/auth.guard';
import { BizService } from '../data/biz.service';
import {
  AttendanceRepository, BookingsRepository, CustomersRepository, MessagesRepository, RequestsRepository, UsersRepository,
} from '../data/repositories';
import { OPEN_STATUSES } from '../entities';
import { monthsBack, period } from './period';

// Dashboard for every staff member; the payload depends on the role (owner: performance + charts,
// employee: my work queue). Ported from `GET /app` in routes/owner.js.
@Controller('dashboard')
@UseGuards(AuthGuard)
export class DashboardController {
  constructor(
    private biz: BizService,
    private requests: RequestsRepository,
    private bookings: BookingsRepository,
    private customers: CustomersRepository,
    private messages: MessagesRepository,
    private attendance: AttendanceRepository,
    private users: UsersRepository,
  ) {}

  @Get()
  get(@CurrentUser() user: AuthUser, @Query() query: Record<string, string>) {
    const me = this.users.findById(user.id)!;
    const t = today();
    const rec = this.attendance.findOne((r) => r.user_id === me.id && r.day === t) ?? null;
    const counts = {
      pending: this.requests.count((r) => r.status === 'Pending Review'),
      open_requests: this.requests.count((r) => OPEN_STATUSES.includes(r.status)),
      confirmed: this.bookings.count((b) => b.status === 'Confirmed'),
      completed: this.bookings.count((b) => b.status === 'Completed'),
      customers: this.customers.count(),
      messages: this.messages.count((m) => m.handled === 0),
    };
    const clock = { name: me.name, rec, mins: this.biz.workedMin(me, rec), now: now(), hours: hrs(this.biz.workedMin(me, rec)) };
    const custName = (id: number) => this.customers.findById(id)?.name ?? '';

    if (user.role !== 'owner') {
      const byIdDesc = <T extends { id: number }>(a: T[]) => a.sort((x, y) => y.id - x.id).slice(0, 8);
      return {
        role: 'employee', counts, clock,
        mine: byIdDesc(this.requests.find((r) => r.assigned_to === me.id && OPEN_STATUSES.includes(r.status)))
          .map((r) => ({ id: r.id, ref: r.ref, status: r.status, service_type: r.service_type, customer: custName(r.customer_id) })),
        newest: byIdDesc(this.requests.find((r) => r.status === 'Pending Review'))
          .map((r) => ({ id: r.id, ref: r.ref, service_type: r.service_type, created_at: r.created_at, customer: custName(r.customer_id) })),
      };
    }

    const per = period({ ...query });
    const { from, to } = per;
    const inR = (ts: string) => ts.slice(0, 10) >= from && ts.slice(0, 10) <= to;
    const f = this.biz.finance(from, to);
    const newInq = this.requests.count((r) => inR(r.created_at));

    // Employee monitoring cards (today)
    const staff = this.biz.activeStaff();
    const todayRecs = this.attendance.find((r) => r.day === t);
    const todayRows = staff.map((u) => this.biz.daily(u, t, t)[0]);
    const emp = {
      active: staff.length,
      timedIn: todayRecs.length,
      clockedIn: todayRecs.filter((r) => r.time_in && !r.time_out).length,
      late: todayRecs.filter((r) => r.is_late).length,
      absent: todayRows.filter((r) => r && r.status === 'Absent').length,
      incomplete: this.attendance.count((r) => !r.time_out && r.day < t && r.day >= from && r.day <= to),
    };

    // Charts (same series as the original chartJson; money in pesos)
    const months = monthsBack(to, 12);
    const series = months.map((m) => { const [a, z] = monthRange(m); return this.biz.finance(a, z); });
    const group = (rows: { k: string }[]) => {
      const m = new Map<string, number>();
      rows.forEach((r) => m.set(r.k, (m.get(r.k) ?? 0) + 1));
      return [...m].map(([k, n]) => ({ k, n }));
    };
    const inPeriod = this.bookings.find((b) => inR(b.created_at));
    const attMonths = months.slice(-6);
    const chart = {
      months,
      sales: series.map((s) => s.booking_sales / 100),
      collected: series.map((s) => s.collected / 100),
      expenses: series.map((s) => s.expenses / 100),
      net: series.map((s) => s.net / 100),
      byService: group(inPeriod.filter((b) => b.status !== 'Cancelled').map((b) => ({ k: b.service_type }))),
      byStatus: group(inPeriod.map((b) => ({ k: b.status }))),
      inquiries: months.map((m) => this.requests.count((r) => r.created_at.slice(0, 7) === m)),
      attMonthly: attMonths.map((m) => this.attendance.count((r) => r.day.slice(0, 7) === m)),
      attMonths,
      perEmp: staff.map((u) => { const s = this.biz.summarize(u, this.biz.daily(u, from, to)); return { n: u.name, late: s.late, absent: s.absent }; }),
    };
    return { role: 'owner', per, f, counts, newInq, emp, chart, clock };
  }
}
