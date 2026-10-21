import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Response } from 'express';
import { paginate, sendCsv } from '../common/http';
import { str, validDate } from '../common/util';
import { AuthGuard, Roles } from '../auth/auth.guard';
import { AuditRepository } from '../data/repositories';

@Controller('audit')
@UseGuards(AuthGuard)
@Roles('owner')
export class AuditController {
  constructor(private audit: AuditRepository) {}

  // Filters: q (action/detail/user/record id), entity, from, to. Newest first, 30 per page, CSV via ?export=csv.
  @Get()
  list(@Query() q: Record<string, string>, @Res() res: Response) {
    const needle = q.q ? str(q.q, 60).toLowerCase() : '';
    const entity = q.entity ? str(q.entity, 30) : '';
    const rows = this.audit.find((r) =>
      (!needle || [r.action, r.detail, r.username, r.entity_id].some((v) => String(v ?? '').toLowerCase().includes(needle))) &&
      (!entity || r.entity === entity) &&
      (!validDate(q.from) || r.at.slice(0, 10) >= q.from) &&
      (!validDate(q.to) || r.at.slice(0, 10) <= q.to),
    ).sort((a, b) => b.id - a.id);

    if (q.export === 'csv') {
      return sendCsv(res, 'audit-log', ['Time', 'User', 'Action', 'Entity', 'ID', 'Detail', 'IP'],
        rows.map((r) => [r.at, r.username, r.action, r.entity, r.entity_id, r.detail, r.ip]));
    }
    const entities = [...new Set(this.audit.findAll().map((r) => r.entity).filter((e): e is string => !!e))].sort();
    res.json({ ...paginate(rows, q, 30), entities });
  }
}
