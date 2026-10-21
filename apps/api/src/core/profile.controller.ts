import { BadRequestException, Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { Request } from 'express';
import { actorOf, AuthGuard, AuthUser, CurrentUser } from '../auth/auth.guard';
import { BizService } from '../data/biz.service';
import { UsersRepository } from '../data/repositories';

@Controller('profile')
@UseGuards(AuthGuard)
export class ProfileController {
  constructor(private users: UsersRepository, private biz: BizService) {}

  @Get()
  get(@CurrentUser() user: AuthUser) {
    const u = this.users.findById(user.id)!;
    const { password_hash, ...safe } = u; // never send the hash
    void password_hash;
    return safe;
  }

  @Post('password')
  async changePassword(@Body() b: { current?: string; next?: string; confirm?: string }, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const u = this.users.findById(user.id)!;
    const next = String(b.next ?? '');
    if (!(await bcrypt.compare(String(b.current ?? ''), u.password_hash))) throw new BadRequestException('Current password is incorrect.');
    if (next.length < 10 || !/[a-z]/i.test(next) || !/\d/.test(next)) {
      throw new BadRequestException('New password must be at least 10 characters and include letters and numbers.');
    }
    if (next !== b.confirm) throw new BadRequestException('New passwords do not match.');
    this.users.update(u.id, { password_hash: await bcrypt.hash(next, 12), must_change_pw: 0 });
    this.biz.audit(actorOf(user), 'password.change', 'user', u.id, '', req.ip ?? null);
    return { ok: true };
  }
}
