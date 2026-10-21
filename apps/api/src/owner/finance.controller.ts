import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { sendCsv } from '../common/http';
import { plain } from '../common/util';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { BizService } from '../data/biz.service';
import { BookingsRepository, CustomersRepository, ExpensesRepository } from '../data/repositories';
import { period } from './period';

@Controller('finance')
@UseGuards(AuthGuard)
@Roles('owner')
export class FinanceController {
  constructor(
    private biz: BizService,
    private bookings: BookingsRepository,
    private expenses: ExpensesRepository,
    private customers: CustomersRepository,
  ) {}

  // Financial Management: totals, breakdowns, largest balances, CSV export (?export=csv).
  @Get()
  get(@Query() query: Record<string, string>, @Res() res: Response) {
    const per = period({ ...query });
    const f = this.biz.finance(per.from, per.to);
    const inR = (ts: string) => ts.slice(0, 10) >= per.from && ts.slice(0, 10) <= per.to;

    if (query.export === 'csv') {
      const rows = [
        ['Booking sales (excl. cancelled)', plain(f.booking_sales)], ['Quoted', plain(f.quoted)], ['Confirmed booking value', plain(f.confirmed)],
        ['Completed value', plain(f.completed)], ['Cancelled value', plain(f.cancelled)], ['Payments received', plain(f.received)],
        ['Refunds', plain(f.refunds)], ['Net collected', plain(f.collected)], ['Supplier costs', plain(f.supplier_costs)],
        ['Service fees', plain(f.fees)], ['Gross booking margin', plain(f.grossMargin)], ['Business expenses', plain(f.expenses)],
        ['Net operating result', plain(f.net)], ['Outstanding balances (as of today)', plain(f.outstanding)],
      ];
      return sendCsv(res, `financial-report-${per.from}_${per.to}`, ['Item', 'Amount (PHP)'], rows);
    }

    const svc = new Map<string, { k: string; n: number; sales: number; cost: number; fees: number }>();
    for (const b of this.bookings.find((x) => ['Confirmed', 'Completed'].includes(x.status) && inR(x.created_at))) {
      const s = svc.get(b.service_type) ?? { k: b.service_type, n: 0, sales: 0, cost: 0, fees: 0 };
      s.n++; s.sales += this.biz.total(b); s.cost += b.supplier_cost; s.fees += b.service_fee;
      svc.set(b.service_type, s);
    }
    const cat = new Map<string, number>();
    for (const e of this.expenses.find((x) => x.status === 'Valid' && inR(x.spent_at))) cat.set(e.category, (cat.get(e.category) ?? 0) + e.amount);

    const owing = this.bookings.find((b) => ['Confirmed', 'Completed'].includes(b.status))
      .map((b) => ({ ...this.biz.decorate(b), customer: this.customers.findById(b.customer_id)?.name ?? '' }))
      .filter((b) => b.balance > 0).sort((a, b) => b.balance - a.balance).slice(0, 15)
      .map((b) => ({ id: b.id, ref: b.ref, customer: b.customer, status: b.status, total: b.total, paid: b.paid, balance: b.balance }));

    res.json({
      per, f,
      byService: [...svc.values()].sort((a, b) => b.sales - a.sales),
      expCat: [...cat].map(([k, total]) => ({ k, total })).sort((a, b) => b.total - a.total),
      owing,
    });
  }
}
