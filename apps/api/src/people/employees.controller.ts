import { Body, Controller, Get, NotFoundException, Param, ParseIntPipe, Post, Put, Req, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Request } from 'express';
import { invalid } from '../common/http';
import { now, pad, str } from '../common/util';
import { actorOf, AuthGuard, AuthUser, CurrentUser, Roles } from '../auth/auth.guard';
import { BizService } from '../data/biz.service';
import { UsersRepository } from '../data/repositories';
import { publicUser } from './people.util';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const flag = (v: unknown) => (v === true || v === 'on' || v === 1 || v === '1' || v === 'true' ? 1 : 0);
const strongPw = (p: unknown) => String(p ?? '').length >= 10 && /\d/.test(String(p)) && /[a-z]/i.test(String(p));

// Same field rules and messages as the original employeeInput().
function employeeInput(b: Record<string, any>, isNew: boolean) {
  const days = Array.isArray(b.workdays) ? b.workdays : String(b.workdays ?? '').split(',');
  const e = {
    name: str(b.name, 120), email: str(b.email, 160), username: str(b.username, 40).toLowerCase(),
    role: b.role === 'owner' ? ('owner' as const) : ('employee' as const),
    active: flag(b.active), can_expenses: flag(b.can_expenses), sched_start: str(b.sched_start, 5), sched_end: str(b.sched_end, 5),
    grace_min: parseInt(b.grace_min, 10), break_min: parseInt(b.break_min, 10),
    workdays: [...new Set(days.filter((d: unknown) => String(d) !== '').map(Number).filter((n: number) => n >= 0 && n <= 6))].sort().join(','),
  };
  const errors: Record<string, string> = {};
  if (!e.name) errors.name = 'Required.';
  if (!/^[a-z0-9._-]{3,40}$/.test(e.username)) errors.username = '3–40 letters, numbers, dot, dash or underscore.';
  if (!TIME.test(e.sched_start)) errors.sched_start = 'Use HH:MM.';
  if (!TIME.test(e.sched_end) || e.sched_end <= e.sched_start) errors.sched_end = 'Must be after the start time.';
  if (!(e.grace_min >= 0 && e.grace_min <= 120)) errors.grace_min = '0–120 minutes.';
  if (!(e.break_min >= 0 && e.break_min <= 240)) errors.break_min = '0–240 minutes.';
  if (isNew && !strongPw(b.password)) errors.password = 'At least 10 characters with letters and numbers.';
  return { e, errors };
}

@Controller('employees')
@UseGuards(AuthGuard)
@Roles('owner')
export class EmployeesController {
  constructor(private users: UsersRepository, private biz: BizService) {}

  @Get()
  list() {
    return this.users.findAll().sort((a, b) => b.active - a.active || a.name.localeCompare(b.name)).map(publicUser);
  }

  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    const u = this.users.findById(id);
    if (!u) throw new NotFoundException();
    return publicUser(u);
  }

  @Post()
  create(@Body() b: Record<string, any>, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const { e, errors } = employeeInput(b, true);
    if (!errors.username && this.users.findByUsername(e.username)) errors.username = 'Already taken.';
    if (Object.keys(errors).length) throw invalid(errors);
    const id = this.users.nextId();
    this.users.create({ ...e, emp_no: 'EMP-' + pad(id, 4), password_hash: bcrypt.hashSync(String(b.password), 12), must_change_pw: 1, created_at: now() });
    this.biz.audit(actorOf(user), 'employee.create', 'user', id, { username: e.username, role: e.role }, req.ip ?? null);
    return { id };
  }

  @Put(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() b: Record<string, any>, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const old = this.users.findById(id);
    if (!old) throw new NotFoundException();
    const { e, errors } = employeeInput(b, false);
    const clash = this.users.findByUsername(e.username);
    if (!errors.username && clash && clash.id !== old.id) errors.username = 'Already taken.';
    if (old.id === user.id && (!e.active || e.role !== 'owner')) errors.name = 'You cannot deactivate or demote your own account.';
    if (b.password && !strongPw(b.password)) errors.password = 'At least 10 characters with letters and numbers.';
    if (Object.keys(errors).length) throw invalid(errors);
    this.users.update(old.id, { ...e, ...(b.password ? { password_hash: bcrypt.hashSync(String(b.password), 12), must_change_pw: 1 } : {}) });
    this.biz.audit(actorOf(user), 'employee.update', 'user', old.id, {
      before: { role: old.role, active: old.active, sched: [old.sched_start, old.sched_end, old.grace_min, old.break_min, old.workdays] },
      after: { role: e.role, active: e.active, sched: [e.sched_start, e.sched_end, e.grace_min, e.break_min, e.workdays] },
      passwordReset: !!b.password,
    }, req.ip ?? null);
    return { ok: true };
  }
}
