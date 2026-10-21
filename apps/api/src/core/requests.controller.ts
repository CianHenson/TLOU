import { BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { actorOf, AuthGuard, AuthUser, CurrentUser } from '../auth/auth.guard';
import { labelOf, parseDetails } from '../common/forms';
import { invalid, paginate, sortRows } from '../common/http';
import { intOrNull, now, rand, str, today } from '../common/util';
import { BizService } from '../data/biz.service';
import {
  BookingsRepository, CustomersRepository, RequestLogRepository, RequestsRepository, UsersRepository,
} from '../data/repositories';
import { SERVICE_TYPES, STATUSES } from '../entities';
import { inRange, like } from './helpers';
import { NotesService } from './notes.service';

const SOURCES = ['Walk-in', 'Phone call', 'Email', 'Social media'];

@Controller('requests')
@UseGuards(AuthGuard)
export class RequestsController {
  constructor(
    private requests: RequestsRepository,
    private customers: CustomersRepository,
    private users: UsersRepository,
    private logs: RequestLogRepository,
    private bookings: BookingsRepository,
    private biz: BizService,
    private notes: NotesService,
  ) {}

  @Get()
  list(@Query() q: Record<string, string>) {
    let rows = this.requests.findAll().map((r) => {
      const c = this.customers.findById(r.customer_id);
      return { ...r, customer: c?.name ?? '', customer_code: c?.code ?? '', phone: c?.phone ?? '', email: c?.email ?? '', employee: this.users.findById(r.assigned_to)?.name ?? null };
    });
    if (q.q) {
      const s = str(q.q, 60);
      rows = rows.filter((r) => like([r.ref, r.customer, r.phone, r.email], s));
    }
    if (STATUSES.includes(q.status)) rows = rows.filter((r) => r.status === q.status);
    if (q.status === 'open') rows = rows.filter((r) => !['Completed', 'Cancelled', 'Rejected'].includes(r.status));
    if (SERVICE_TYPES.includes(q.service)) rows = rows.filter((r) => r.service_type === q.service);
    if (intOrNull(q.employee)) rows = rows.filter((r) => r.assigned_to === Number(q.employee));
    rows = rows.filter((r) => inRange(r.created_at, q));
    rows = sortRows(rows, q, { date: (r) => r.created_at, ref: (r) => r.ref, customer: (r) => r.customer.toLowerCase(), status: (r) => r.status }, 'date');
    // The list does not need the contact columns used for searching.
    const page = paginate(rows, q);
    return { ...page, rows: page.rows.map(({ phone, email, ...r }) => (void phone, void email, r)) };
  }

  @Post()
  create(@Body() b: Record<string, any>, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const errors: Record<string, string> = {};
    const cust = this.customers.findById(intOrNull(b.customer_id));
    if (!cust) errors.customer_id = 'Choose a customer (create one first if new).';
    if (!SERVICE_TYPES.includes(b.service_type)) errors.service_type = 'Choose a service.';
    const source = SOURCES.includes(b.source) ? (b.source as string) : null;
    if (!source) errors.source = 'Choose the channel.';
    const parsed = SERVICE_TYPES.includes(b.service_type) ? parseDetails(b.service_type, b) : { details: {}, errors: {} };
    Object.assign(errors, parsed.errors);
    if (Object.keys(errors).length) throw invalid(errors);

    let ref: string;
    do { ref = `TR-${today().replace(/-/g, '')}-${rand(4)}`; } while (this.requests.findOne((r) => r.ref === ref));
    const r = this.requests.create({
      ref, customer_id: cust!.id, service_type: b.service_type, details: JSON.stringify(parsed.details), status: 'Pending Review',
      source: source!, assigned_to: user.id, created_at: now(),
    });
    this.logs.create({ request_id: r.id, from_status: null, to_status: 'Pending Review', note: `Registered (${source})`, user_id: user.id, at: now() });
    this.biz.audit(actorOf(user), 'request.create', 'request', r.id, source, req.ip ?? null);
    return { id: r.id };
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    const r = this.requests.findById(id);
    if (!r) throw new NotFoundException();
    const c = this.customers.findById(r.customer_id);
    const log = this.logs.find((l) => l.request_id === id).sort((a, b) => b.id - a.id)
      .map((l) => ({ ...l, who: this.users.findById(l.user_id)?.name ?? null }));
    return {
      r: { ...r, customer: c?.name ?? '', customer_code: c?.code ?? '', phone: c?.phone ?? '', email: c?.email ?? '', employee: this.users.findById(r.assigned_to)?.name ?? null },
      details: JSON.parse(r.details || '{}') as Record<string, string>,
      labels: labelOf(r.service_type),
      log,
      notes: this.notes.forEntity('request', id),
      bookings: this.bookings.find((b) => b.request_id === id).map(({ id: bid, ref, status }) => ({ id: bid, ref, status })),
    };
  }

  @Post(':id/status')
  setStatus(@Param('id', ParseIntPipe) id: number, @Body() b: Record<string, any>, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const r = this.requests.findById(id);
    if (!r) throw new NotFoundException();
    const to = String(b.status ?? '');
    const note = str(b.note, 1000);
    if (!STATUSES.includes(to)) throw new BadRequestException('Invalid status.');
    if (to === r.status && !note) throw new BadRequestException('Status unchanged.');
    const assignee = intOrNull(b.assigned_to);
    this.requests.update(id, { status: to, assigned_to: assignee ?? r.assigned_to ?? user.id });
    this.logs.create({ request_id: id, from_status: r.status, to_status: to, note, user_id: user.id, at: now() });
    this.biz.audit(actorOf(user), 'request.status', 'request', id, `${r.status} -> ${to}`, req.ip ?? null);
    return { ok: true };
  }
}
