import { Body, Controller, Get, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Throttle } from '@nestjs/throttler';
import * as bcrypt from 'bcryptjs';
import { Request } from 'express';
import { BizService } from '../data/biz.service';
import { UsersRepository } from '../data/repositories';
import { actorOf, AuthGuard, AuthUser, CurrentUser } from './auth.guard';

const DUMMY = bcrypt.hashSync('not-a-real-password', 12); // constant-time-ish response for unknown users

@Controller('auth')
export class AuthController {
  constructor(private users: UsersRepository, private jwt: JwtService, private biz: BizService) {}

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 15 * 60_000 } })
  async login(@Body() body: { username?: string; password?: string }, @Req() req: Request) {
    const username = String(body.username ?? '').trim().toLowerCase().slice(0, 60);
    const u = this.users.findByUsername(username);
    const ok = (await bcrypt.compare(String(body.password ?? ''), u ? u.password_hash : DUMMY)) && !!u && !!u.active;
    if (!ok || !u) {
      this.biz.audit(null, 'login.fail', 'user', null, username, req.ip ?? null);
      throw new UnauthorizedException('Invalid username or password.');
    }
    this.biz.audit({ id: u.id, username: u.username }, 'login', 'user', u.id, '', req.ip ?? null);
    const accessToken = await this.jwt.signAsync({ sub: u.id });
    return { accessToken, user: this.profile(u.id) };
  }

  @Get('me')
  @UseGuards(AuthGuard)
  me(@CurrentUser() user: AuthUser) {
    return this.profile(user.id);
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  logout(@CurrentUser() user: AuthUser, @Req() req: Request) {
    this.biz.audit(actorOf(user), 'logout', 'user', user.id, '', req.ip ?? null);
    return { ok: true };
  }

  private profile(id: number) {
    const u = this.users.findById(id)!;
    return { id: u.id, emp_no: u.emp_no, name: u.name, username: u.username, role: u.role, can_expenses: !!u.can_expenses, must_change_pw: !!u.must_change_pw };
  }
}
