import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { invalid } from '../common/http';
import { str } from '../common/util';
import { actorOf, AuthGuard, AuthUser, CurrentUser, Roles } from '../auth/auth.guard';
import { BizService } from '../data/biz.service';
import { ServicesRepository } from '../data/repositories';
import { SERVICE_TYPES } from '../entities';

@Controller('services')
@UseGuards(AuthGuard)
@Roles('owner')
export class ServicesController {
  constructor(private services: ServicesRepository, private biz: BizService) {}

  @Get()
  list() {
    return { services: this.services.findAll().sort((a, b) => a.sort - b.sort || a.id - b.id), types: SERVICE_TYPES };
  }

  // Create (no id) or update (id) a service; same validation as the original form handler.
  @Post()
  save(@Body() b: Record<string, any>, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const id = /^\d+$/.test(String(b.id ?? '')) ? Number(b.id) : null;
    const name = str(b.name, 120);
    if (!name || !SERVICE_TYPES.includes(b.type)) {
      throw invalid({ ...(name ? {} : { name: 'Required.' }), ...(SERVICE_TYPES.includes(b.type) ? {} : { type: 'Choose a request type.' }) }, 'Name and a valid request type are required.');
    }
    const vals = {
      name, type: b.type as string, description: str(b.description, 600), icon: str(b.icon, 8),
      active: b.active === true || b.active === 'on' || b.active === 1 ? 1 : 0, sort: parseInt(b.sort, 10) || 0,
    };
    const saved = id && this.services.findById(id) ? this.services.update(id, vals)! : this.services.create(vals);
    this.biz.audit(actorOf(user), id ? 'service.update' : 'service.create', 'service', saved.id, name, req.ip ?? null);
    return saved;
  }
}
