import { BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Query, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { actorOf, AuthGuard, AuthUser, CurrentUser, Roles } from '../auth/auth.guard';
import { paginate, sendCsv, sortRows } from '../common/http';
import { intOrNull, plain, str } from '../common/util';
import { BizService } from '../data/biz.service';
import { BookingsRepository, CustomersRepository, PaymentsRepository, UsersRepository } from '../data/repositories';
import { METHODS } from '../entities';
import { inRange, like } from './helpers';

@Controller('payments')
@UseGuards(AuthGuard)
export class PaymentsController {
  constructor(
    private payments: PaymentsRepository,
    private customers: CustomersRepository,
    private bookings: BookingsRepository,
    private users: UsersRepository,
    private biz: BizService,
  ) {}

  private query(q: Record<string, string>) {
    let rows = this.payments.findAll().map((p) => ({
      ...p,
      customer: this.customers.findById(p.customer_id)?.name ?? '',
      booking_ref: this.bookings.findById(p.booking_id)?.ref ?? '',
      recorder: this.users.findById(p.user_id)?.name ?? null,
    }));
    if (q.q) {
      const s = str(q.q, 60);
      rows = rows.filter((p) => like([p.ref, p.customer, p.booking_ref, p.reference], s));
    }
    if (['Payment', 'Refund'].includes(q.kind)) rows = rows.filter((p) => p.kind === q.kind);
    if (['Valid', 'Reversed'].includes(q.pstatus)) rows = rows.filter((p) => p.status === q.pstatus);
    if (METHODS.includes(q.method)) rows = rows.filter((p) => p.method === q.method);
    if (intOrNull(q.employee)) rows = rows.filter((p) => p.user_id === Number(q.employee));
    if (intOrNull(q.customer)) rows = rows.filter((p) => p.customer_id === Number(q.customer));
    rows = rows.filter((p) => inRange(p.paid_at, q));
    return sortRows(rows, q, { date: (p) => p.paid_at, amount: (p) => p.amount, customer: (p) => p.customer.toLowerCase(), ref: (p) => p.ref }, 'date');
  }

  @Get()
  list(@Query() q: Record<string, string>, @Res() res: Response) {
    const rows = this.query(q);
    if (q.export === 'csv') {
      return sendCsv(res, 'transactions', ['Payment ID', 'Date', 'Type', 'Status', 'Customer', 'Booking', 'Method', 'Reference', 'Amount', 'Recorded by', 'Remarks'],
        rows.map((r) => [r.ref, r.paid_at, r.kind, r.status, r.customer, r.booking_ref, r.method, r.reference, (r.kind === 'Refund' ? '-' : '') + plain(r.amount), r.recorder, r.remarks]));
    }
    return res.json(paginate(rows, q));
  }

  // Records are never deleted: the owner reverses them with a reason and they stop counting in totals.
  @Post(':id/reverse')
  @Roles('owner')
  reverse(@Param('id', ParseIntPipe) id: number, @Body() b: { reason?: string }, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const p = this.payments.findById(id);
    if (!p) throw new NotFoundException();
    const reason = str(b.reason, 500);
    if (!reason) throw new BadRequestException('A reason is required to reverse a payment.');
    if (p.status !== 'Valid') throw new BadRequestException('Already reversed.');
    this.payments.update(id, { status: 'Reversed', reversed_by: user.id, reversed_reason: reason });
    this.biz.audit(actorOf(user), 'payment.reverse', 'payment', id, { amount: p.amount, kind: p.kind, reason }, req.ip ?? null);
    return { ok: true };
  }
}
