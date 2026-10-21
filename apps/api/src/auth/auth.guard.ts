import {
  CanActivate, createParamDecorator, ExecutionContext, ForbiddenException, Injectable, SetMetadata, UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Role } from '../entities';
import { UsersRepository } from '../data/repositories';

export interface AuthUser {
  id: number; username: string; name: string; role: Role; can_expenses: boolean; must_change_pw: boolean;
}

const ROLES_KEY = 'roles';
const EXPENSES_KEY = 'expenses';
/** Owner only. */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
/** Owner, or an employee the owner allowed to manage expenses. */
export const RequireExpenses = () => SetMetadata(EXPENSES_KEY, true);
/** The logged-in user (fresh from the user store on every request, like the original requireLogin). */
export const CurrentUser = createParamDecorator((_: unknown, ctx: ExecutionContext): AuthUser => ctx.switchToHttp().getRequest().user);
/** Actor + ip for audit rows. */
export const actorOf = (u: AuthUser) => ({ id: u.id, username: u.username });

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService, private reflector: Reflector, private users: UsersRepository) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const [type, token] = (req.headers.authorization ?? '').split(' ');
    if (type !== 'Bearer' || !token) throw new UnauthorizedException();
    let sub: number;
    try {
      sub = (await this.jwt.verifyAsync<{ sub: number }>(token)).sub;
    } catch {
      throw new UnauthorizedException();
    }
    const u = this.users.findById(sub);
    if (!u || !u.active) throw new UnauthorizedException();
    const user: AuthUser = { id: u.id, username: u.username, name: u.name, role: u.role, can_expenses: !!u.can_expenses, must_change_pw: !!u.must_change_pw };
    req.user = user;

    // A forced password change blocks everything except the profile/auth endpoints.
    if (user.must_change_pw && !/^\/api\/(profile|auth)/.test(req.originalUrl)) {
      throw new ForbiddenException('PASSWORD_CHANGE_REQUIRED');
    }
    const roles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (roles?.length && !roles.includes(user.role)) throw new ForbiddenException('You do not have permission to open this page.');
    const needsExpenses = this.reflector.getAllAndOverride<boolean | undefined>(EXPENSES_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (needsExpenses && user.role !== 'owner' && !user.can_expenses) throw new ForbiddenException('You do not have permission to open this page.');
    return true;
  }
}
