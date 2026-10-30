// Current-user lookup and access guards. The session cookie (see session.ts) only carries { uid, exp } + an HMAC;
// the user record is always re-read from MySQL so deactivation and role changes apply immediately.
import 'server-only';
import { cache } from 'react';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { db } from './db';
import { COOKIE, MAX_AGE, REMEMBER_MAX_AGE, cookieOptions, readSession, signSession } from './session';

export interface SessionUser {
  id: number; username: string; name: string; role: 'owner' | 'admin' | 'employee'; emp_no: string;
  can_expenses: boolean; must_change_pw: boolean;
}
/** Owner-level access: the (single) owner and admins see and manage the same modules. */
export const isOwner = (u: SessionUser) => u.role === 'owner' || u.role === 'admin';

/** Set the session cookie (login) - for route handlers. */
export async function startSession(uid: number, remember = false) {
  const maxAge = remember ? REMEMBER_MAX_AGE : MAX_AGE;
  (await cookies()).set(COOKIE, signSession(uid, maxAge), cookieOptions(maxAge));
}
export async function endSession() {
  (await cookies()).set(COOKIE, '', { ...cookieOptions(), maxAge: 0 });
}

/** The signed-in, still-active user (fresh from the DB), or null. Memoised per request. */
export const currentUser = cache(async (): Promise<SessionUser | null> => {
  const uid = readSession((await cookies()).get(COOKIE)?.value);
  if (!uid) return null;
  const u = await db.get(`SELECT id,username,name,role,emp_no,can_expenses,must_change_pw,active FROM users WHERE id=?`, [uid]);
  if (!u || !u.active) return null;
  return { id: u.id, username: u.username, name: u.name, role: u.role, emp_no: u.emp_no, can_expenses: !!u.can_expenses, must_change_pw: !!u.must_change_pw };
});

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

type Need = 'user' | 'owner' | 'expenses';
const allowed = (u: SessionUser, need: Need) => need === 'user' || (need === 'owner' ? isOwner(u) : isOwner(u) || u.can_expenses);

/** The only /app pages the owner sees (each entry also covers its sub-pages). Everything else redirects to the dashboard. */
const OWNER_MODULES = ['/app/airfare', '/app/attendance-monitor', '/app/finance', '/app/finance-monitor', '/app/expenses', '/app/employees', '/app/payslip', '/app/audit', '/app/profile', '/app/forbidden'];
const ownerHidden = (path: string) => path !== '/app' && !OWNER_MODULES.some((m) => path === m || path.startsWith(m + '/'));

/** For pages / layouts: returns the user or redirects. Forbidden roles get /app/forbidden. */
export async function requireUser(need: Need = 'user'): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) redirect('/login');
  if (isOwner(u) && ownerHidden((await headers()).get('x-pathname') ?? '/app')) redirect('/app');
  if (!allowed(u, need)) redirect('/app/forbidden');
  return u;
}

/** For route handlers: returns the user or throws HttpError (401 / 403) which the `api()` wrapper turns into JSON. */
export async function apiUser(need: Need = 'user'): Promise<SessionUser> {
  const u = await currentUser();
  if (!u) throw new HttpError(401, 'Please sign in again.');
  if (!allowed(u, need)) throw new HttpError(403, 'You do not have permission to do that.');
  return u;
}
