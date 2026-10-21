import {
  BadRequestException, Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Query, Req, Res, UploadedFile,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request, Response } from 'express';
import { actorOf, AuthGuard, AuthUser, CurrentUser, RequireExpenses, Roles } from '../auth/auth.guard';
import { paginate, sendCsv } from '../common/http';
import { now, plain, str, toCents, today, validDate } from '../common/util';
import { BizService } from '../data/biz.service';
import { ExpensesRepository, NotesRepository, UsersRepository } from '../data/repositories';
import { EXPENSE_CATS, Note } from '../entities';
import { inRange, like } from './helpers';
import { discard, sendStored, uploadOptions } from './uploads';

@Controller('expenses')
@UseGuards(AuthGuard)
@RequireExpenses()
export class ExpensesController {
  constructor(
    private expenses: ExpensesRepository,
    private notes: NotesRepository,
    private users: UsersRepository,
    private biz: BizService,
  ) {}

  @Get()
  list(@Query() q: Record<string, string>, @Res() res: Response) {
    let rows = this.expenses.findAll().map((e) => ({ ...e, recorder: this.users.findById(e.user_id)?.name ?? null }));
    if (q.q) {
      const s = str(q.q, 60);
      rows = rows.filter((e) => like([e.description, e.category], s));
    }
    if (EXPENSE_CATS.includes(q.category)) rows = rows.filter((e) => e.category === q.category);
    rows = rows.filter((e) => inRange(e.spent_at, q)).sort((a, b) => (a.spent_at < b.spent_at ? 1 : a.spent_at > b.spent_at ? -1 : b.id - a.id));
    if (q.export === 'csv') {
      return sendCsv(res, 'expenses', ['ID', 'Date', 'Category', 'Amount', 'Method', 'Description', 'Status', 'Recorded by'],
        rows.map((r) => [r.id, r.spent_at, r.category, plain(r.amount), r.method, r.description, r.status, r.recorder]));
    }
    const total = rows.filter((e) => e.status === 'Valid').reduce((s, e) => s + e.amount, 0);
    return res.json({ ...paginate(rows, q), total });
  }

  @Post()
  @UseInterceptors(FileInterceptor('receipt', uploadOptions))
  create(@Body() b: Record<string, any>, @UploadedFile() file: Express.Multer.File | undefined, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const amt = toCents(b.amount);
    const date = str(b.spent_at, 10) || today();
    const err = !Number.isFinite(amt) || amt <= 0 ? 'Enter a valid amount.'
      : !validDate(date) || date > today() ? 'Enter a valid date (not in the future).'
      : !EXPENSE_CATS.includes(b.category) ? 'Choose a category.'
      : !['Cash', 'GCash', 'Maya', 'Bank transfer', 'Credit/debit card', 'Check', 'Other'].includes(b.method) ? 'Choose a payment method.'
      : !str(b.description) ? 'Add a description.' : null;
    if (err) { discard(file); throw new BadRequestException(err); }
    const e = this.expenses.create({
      spent_at: date, category: b.category, amount: amt, method: b.method, description: str(b.description, 500),
      receipt: file ? file.filename : null, user_id: user.id, status: 'Valid', void_reason: null, created_at: now(),
    });
    // The original file name is kept as a note, as the original app did.
    if (file) this.notes.create({ entity: 'expense_file' as Note['entity'], entity_id: e.id, body: file.originalname.slice(0, 200), user_id: user.id, at: now() });
    this.biz.audit(actorOf(user), 'expense.create', 'expense', e.id, { amount: amt, category: b.category }, req.ip ?? null);
    return { id: e.id };
  }

  @Post(':id/void')
  @Roles('owner')
  void(@Param('id', ParseIntPipe) id: number, @Body() b: { reason?: string }, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const e = this.expenses.findById(id);
    if (!e) throw new NotFoundException();
    const reason = str(b.reason, 500);
    if (!reason) throw new BadRequestException('A reason is required to void an expense.');
    this.expenses.update(id, { status: 'Voided', void_reason: reason });
    this.biz.audit(actorOf(user), 'expense.void', 'expense', id, { amount: e.amount, reason }, req.ip ?? null);
    return { ok: true };
  }

  @Get(':id/receipt')
  receipt(@Param('id', ParseIntPipe) id: number, @Res() res: Response) {
    const e = this.expenses.findById(id);
    if (!e || !e.receipt) throw new NotFoundException();
    const n = this.notes.findOne((x) => (x.entity as string) === 'expense_file' && x.entity_id === id);
    return sendStored(res, e.receipt, n ? n.body : e.receipt);
  }
}
