// Edge gate for the staff area: redirects visitors without a (validly signed, unexpired) session cookie to /login.
// Authorisation (active user, role, forced password change) is re-checked against MySQL in requireUser()/apiUser().
import { NextResponse, type NextRequest } from 'next/server';
import { readSession, COOKIE } from '@/lib/session';

export async function proxy(req: NextRequest) {
  const uid = readSession(req.cookies.get(COOKIE)?.value);
  if (!uid) {
    const url = req.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ['/app/:path*'] };
