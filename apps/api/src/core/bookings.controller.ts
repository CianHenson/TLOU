import {
  BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Put, Query, Req, UploadedFile,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { actorOf, AuthGuard, AuthUser, CurrentUser } from '../auth/auth.guard';
import { labelOf } from '../common/forms';
import { invalid, paginate, sortRows } from '../common/http';
import { intOrNull, now, pad, str, toCents, today, validDate } from '../common/util';
import { BizService } from '../data/biz.service';
import {
  BookingsRepository, CustomersRepository, DocumentsRepository, PaymentsRepository, RequestsRepository, UsersRepository,
} from '../data/repositories';
import { Booking, BOOKING_STATUSES, METHODS, SERVICE_TYPES } from '../entities';
import { inRange, like } from './helpers';
import { NotesService } from './notes.service';
import { discard, uploadOptions } from './uploads';

const MONEY = ['supplier_cost', 'selling_price', 'service_fee', 'discount'] as const;
const peso = (c: number) => '₱' + (c / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

@Controller('bookings')
@UseGuards(AuthGuard)
export class BookingsController {
  constructor(
    private bookings: BookingsRepository,
    private customers: CustomersRepository,
    private requests: RequestsRepository,
    private payments: PaymentsRepository,
    private documents: DocumentsRepository,
    private users: UsersRepository,
    private biz: BizService,
    private notes: NotesService,
  ) {}

  private bookingInput(b: Record<string, any>) {
    const e: Record<string, string> = {};
    const v = {
      customer_id: intOrNull(b.customer_id) as number, request_id: intOrNull(b.request_id), service_type: String(b.service_type ?? ''),
      supplier: str(b.supplier, 160), details: str(b.details, 3000), confirmation_ref: str(b.confirmation_ref, 80),
      remarks: str(b.remarks, 2000), status: String(b.status ?? '') as Booking['status'], assigned_to: intOrNull(b.assigned_to),
      supplier_cost: 0, selling_price: 0, service_fee: 0, discount: 0,
    };
    for (const k of MONEY) {
      const c = b[k] === '' || b[k] == null ? 0 : toCents(b[k]);
      if (!Number.isFinite(c) || c < 0 || c > 1e11) e[k] = 'Enter an amount of 0 or more.';
      else v[k] = c;
    }
    if (!this.customers.findById(v.customer_id)) e.customer_id = 'Choose a customer.';
    if (!SERVICE_TYPES.includes(v.service_type)) e.service_type = 'Choose a service type.';
    if (!BOOKING_STATUSES.includes(v.status)) e.status = 'Choose a status.';
    if (v.assigned_to && !this.users.findOne((u) => u.id === v.assigned_to && u.active === 1)) v.assigned_to = null;
    if (!e.selling_price && !e.service_fee && !e.discount && v.discount > v.selling_price + v.service_fee) e.discount = 'Discount cannot exceed the price plus fee.';
    if (v.request_id && !this.requests.findById(v.request_id)) v.request_id = null;
    return { v, e };
  }

  /** A booking with its decorated money plus customer / employee names. */
  private load(id: number) {
    const b = this.bookings.findById(id);
    if (!b) return undefined;
    const c = this.customers.findById(b.customer_id);
    return { ...this.biz.decorate(b), customer: c?.name ?? '', customer_code: c?.code ?? '', employee: this.users.findById(b.assigned_to)?.name ?? null };
  }

  @Get()
  list(@Query() q: Record<string, string>) {
    let rows = this.bookings.findAll().map((b) => this.load(b.id)!);
    if (q.q) {
      const s = str(q.q, 60);
      rows = rows.filter((b) => like([b.ref, b.customer, b.supplier, b.confirmation_ref], s));
    }
    if (BOOKING_STATUSES.includes(q.status)) rows = rows.filter((b) => b.status === q.status);
    if (SERVICE_TYPES.includes(q.service)) rows = rows.filter((b) => b.service_type === q.service);
    if (intOrNull(q.employee)) rows = rows.filter((b) => b.assigned_to === Number(q.employee));
    if (intOrNull(q.customer)) rows = rows.filter((b) => b.customer_id === Number(q.customer));
    rows = rows.filter((b) => inRange(b.created_at, q));
    const pay: Record<string, (b: { paid: number; total: number }) => boolean> = {
      Unpaid: (b) => b.paid <= 0, 'Partially Paid': (b) => b.paid > 0 && b.paid < b.total, Paid: (b) => b.paid === b.total, Overpaid: (b) => b.paid > b.total,
    };
    if (pay[q.pay]) rows = rows.filter(pay[q.pay]);
    rows = sortRows(rows, q, { date: (b) => b.created_at, ref: (b) => b.ref, customer: (b) => b.customer.toLowerCase(), total: (b) => b.total, status: (b) => b.status }, 'date');
    return paginate(rows, q);
  }

  // Defaults for "New booking", optionally from a request (?request=ID) or a customer (?customer=ID).
  @Get('prefill')
  prefill(@Query() q: Record<string, string>, @CurrentUser() user: AuthUser) {
    const rq = this.requests.findById(intOrNull(q.request));
    const labels = rq ? labelOf(rq.service_type) : {};
    return {
      status: 'Quoted',
      customer_id: rq ? rq.customer_id : intOrNull(q.customer) ?? '',
      request_id: rq ? rq.id : '',
      service_type: rq ? rq.service_type : '',
      assigned_to: user.id,
      details: rq
        ? Object.entries(JSON.parse(rq.details) as Record<string, string>).filter(([k]) => !k.startsWith('contact_')).map(([k, x]) => `${labels[k] || k}: ${x}`).join('\n')
        : '',
    };
  }

  @Post()
  create(@Body() body: Record<string, any>, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const { v, e } = this.bookingInput(body);
    if (Object.keys(e).length) throw invalid(e);
    const id = this.bookings.nextId();
    this.bookings.create({ ...v, ref: `BK-${today().slice(0, 4)}-${pad(id)}`, created_at: now(), updated_at: null });
    this.biz.audit(actorOf(user), 'booking.create', 'booking', id, v, req.ip ?? null);
    return { id };
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    const b = this.load(id);
    if (!b) throw new NotFoundException();
    const request = b.request_id ? this.requests.findById(b.request_id) : undefined;
    return {
      b,
      payments: this.payments.find((p) => p.booking_id === id).sort((x, y) => y.id - x.id).map((p) => ({ ...p, recorder: this.users.findById(p.user_id)?.name ?? null })),
      docs: this.documents.find((d) => d.booking_id === id).sort((x, y) => y.id - x.id).map((d) => ({ ...d, uploader: this.users.findById(d.user_id)?.name ?? null })),
      notes: this.notes.forEntity('booking', id),
      request: request ? { id: request.id, ref: request.ref } : null,
    };
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, any>, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const old = this.load(id);
    if (!old) throw new NotFoundException();
    const { v, e } = this.bookingInput({ ...body, customer_id: old.customer_id });
    if (Object.keys(e).length) throw invalid(e);
    const { customer_id, ...patch } = v; // the customer of a booking never changes
    void customer_id;
    this.bookings.update(id, { ...patch, updated_at: now() });
    this.biz.audit(actorOf(user), 'booking.update', 'booking', id, {
      before: { s: old.status, cost: old.supplier_cost, price: old.selling_price, fee: old.service_fee, disc: old.discount },
      after: { s: v.status, cost: v.supplier_cost, price: v.selling_price, fee: v.service_fee, disc: v.discount },
    }, req.ip ?? null);
    const warning = v.status === 'Cancelled' && old.status !== 'Cancelled' && old.paid > 0
      ? `Booking cancelled, but ${peso(old.paid)} was collected. Record any refund as a Refund payment so reports stay accurate.`
      : null;
    return { id, warning };
  }

  @Post(':id/payment')
  addPayment(@Param('id', ParseIntPipe) id: number, @Body() body: Record<string, any>, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const b = this.load(id);
    if (!b) throw new NotFoundException();
    const kind = body.kind === 'Refund' ? 'Refund' : 'Payment';
    const amt = toCents(body.amount);
    const date = str(body.paid_at, 10) || today();
    if (!Number.isFinite(amt) || amt <= 0 || amt > 1e11) throw new BadRequestException('Enter a valid amount greater than zero.');
    if (!validDate(date) || date > today()) throw new BadRequestException('Payment date cannot be blank or in the future.');
    if (!METHODS.includes(body.method)) throw new BadRequestException('Choose a payment method.');
    if (b.status === 'Cancelled' && kind === 'Payment') throw new BadRequestException('This booking is cancelled; only refunds can be recorded.');
    if (kind === 'Refund' && amt > b.paid) throw new BadRequestException(`A refund cannot exceed the net amount paid (${peso(b.paid)}).`);
    const pid = this.payments.nextId();
    this.payments.create({
      ref: `PAY-${pad(pid, 6)}`, booking_id: b.id, customer_id: b.customer_id, paid_at: date, amount: amt, method: body.method,
      reference: str(body.reference, 80), kind, status: 'Valid', remarks: str(body.remarks, 500), user_id: user.id,
      reversed_by: null, reversed_reason: null, created_at: now(),
    });
    this.biz.audit(actorOf(user), 'payment.' + kind.toLowerCase(), 'payment', pid, { booking: b.ref, amount: amt }, req.ip ?? null);
    return { id: pid, message: `${kind} of ${peso(amt)} recorded.` };
  }

  @Post(':id/upload')
  @UseInterceptors(FileInterceptor('file', uploadOptions))
  upload(@Param('id', ParseIntPipe) id: number, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const b = this.bookings.findById(id);
    if (!b) { discard(file); throw new NotFoundException(); }
    if (!file) throw new BadRequestException('Choose a file to upload.');
    const d = this.documents.create({ booking_id: id, stored: file.filename, original: file.originalname.slice(0, 200), user_id: user.id, at: now() });
    this.biz.audit(actorOf(user), 'document.upload', 'booking', id, file.originalname.slice(0, 100), req.ip ?? null);
    return { id: d.id };
  }
}
