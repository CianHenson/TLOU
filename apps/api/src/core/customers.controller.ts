import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Put, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { actorOf, AuthGuard, AuthUser, CurrentUser } from '../auth/auth.guard';
import { invalid, paginate, sortRows } from '../common/http';
import { intOrNull, now, pad, str } from '../common/util';
import { BizService } from '../data/biz.service';
import {
  BookingsRepository, CustomersRepository, PaymentsRepository, RequestsRepository, UsersRepository,
} from '../data/repositories';
import { isEmail, like } from './helpers';
import { NotesService } from './notes.service';

function custInput(b: Record<string, any>) {
  const c = {
    name: str(b.name, 120), phone: str(b.phone, 40), email: str(b.email, 160).toLowerCase(),
    pref_contact: str(b.pref_contact, 30), notes: str(b.notes, 2000),
  };
  const errors: Record<string, string> = {};
  if (!c.name) errors.name = 'Required.';
  if (!c.phone && !c.email) errors.phone = 'Provide a phone number or email.';
  if (c.email && !isEmail(c.email)) errors.email = 'Invalid email.';
  return { c, errors };
}

@Controller('customers')
@UseGuards(AuthGuard)
export class CustomersController {
  constructor(
    private customers: CustomersRepository,
    private requests: RequestsRepository,
    private bookings: BookingsRepository,
    private payments: PaymentsRepository,
    private users: UsersRepository,
    private biz: BizService,
    private notes: NotesService,
  ) {}

  @Get()
  list(@Query() q: Record<string, string>) {
    let rows = this.customers.findAll().map((c) => ({
      ...c,
      balance: this.biz.customerBalance(c.id),
      n_req: this.requests.count((r) => r.customer_id === c.id),
      n_bk: this.bookings.count((b) => b.customer_id === c.id),
    }));
    if (q.q) {
      const s = str(q.q, 60);
      rows = rows.filter((c) => like([c.name, c.phone, c.email, c.code], s));
    }
    if (q.owing) rows = rows.filter((c) => c.balance > 0);
    rows = sortRows(rows, q, { name: (c) => c.name, code: (c) => c.code, date: (c) => c.created_at, balance: (c) => c.balance }, 'date');
    return paginate(rows, q);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    const c = this.customers.findById(id);
    if (!c) throw new NotFoundException();
    const bookings = this.bookings.find((b) => b.customer_id === id).sort((a, b) => b.id - a.id).map((b) => this.biz.decorate(b));
    const payments = this.payments.find((p) => p.customer_id === id).sort((a, b) => b.id - a.id)
      .map((p) => ({ ...p, booking_ref: this.bookings.findById(p.booking_id)?.ref ?? '' }));
    return {
      c: { ...c, balance: this.biz.customerBalance(id) },
      bookings,
      requests: this.requests.find((r) => r.customer_id === id).sort((a, b) => b.id - a.id),
      payments,
      notes: this.notes.forEntity('customer', id),
    };
  }

  @Post()
  create(@Body() body: Record<string, any>, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const { c, errors } = custInput(body);
    if (Object.keys(errors).length) throw invalid(errors);
    const created = this.customers.create({ ...c, code: 'CUST-' + pad(this.customers.nextId()), created_at: now() });
    this.biz.audit(actorOf(user), 'customer.create', 'customer', created.id, c.name, req.ip ?? null);
    return { id: created.id };
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, any>, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const old = this.customers.findById(id);
    if (!old) throw new NotFoundException();
    const { c, errors } = custInput(body);
    if (Object.keys(errors).length) throw invalid(errors);
    this.customers.update(id, c);
    this.biz.audit(actorOf(user), 'customer.update', 'customer', id, { before: old, after: c }, req.ip ?? null);
    return { id };
  }
}

// Pickers used by the forms: customers (id/code/name) and active staff (id/name).
@Controller('options')
@UseGuards(AuthGuard)
export class OptionsController {
  constructor(private customers: CustomersRepository, private users: UsersRepository) {}

  @Get()
  options() {
    const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);
    return {
      customers: this.customers.findAll().map(({ id, code, name }) => ({ id, code, name })).sort(byName),
      staff: this.users.find((u) => u.active === 1).map(({ id, name }) => ({ id, name })).sort(byName),
    };
  }
}

@Controller('notes')
@UseGuards(AuthGuard)
export class NotesController {
  constructor(private notes: NotesService, private biz: BizService) {}

  @Post()
  add(@Body() b: Record<string, any>, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const entity = ['customer', 'request', 'booking'].includes(b.entity) ? (b.entity as 'customer' | 'request' | 'booking') : null;
    const id = intOrNull(b.entity_id);
    const body = str(b.body, 2000);
    if (!entity || !id || !body) throw new BadRequestException('Write a note first.');
    const n = this.notes.add(entity, id, body, user.id);
    this.biz.audit(actorOf(user), 'note.add', entity, id, body.slice(0, 80), req.ip ?? null);
    return { id: n.id };
  }
}
