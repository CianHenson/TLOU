// Signed session tokens (HMAC-SHA256). No database access here so proxy.ts can use it.
// The signing key is SESSION_SECRET, or a random key generated once and kept in data/.session-secret.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export const COOKIE = 'tsid';
export const MAX_AGE = 60 * 60 * 8; // 8 hours

let cached: string | undefined;
function secret() {
  if (cached) return cached;
  if (process.env.SESSION_SECRET) return (cached = process.env.SESSION_SECRET);
  const dir = path.join(process.cwd(), 'data'), file = path.join(dir, '.session-secret');
  try { return (cached = fs.readFileSync(file, 'utf8').trim()); } catch { /* generate below */ }
  fs.mkdirSync(dir, { recursive: true });
  const s = crypto.randomBytes(32).toString('hex');
  try { fs.writeFileSync(file, s, { flag: 'wx', mode: 0o600 }); } catch { /* another worker won the race */ }
  return (cached = fs.readFileSync(file, 'utf8').trim());
}

const mac = (body: string) => crypto.createHmac('sha256', secret()).update(body).digest('base64url');

export function signSession(uid: number) {
  const body = Buffer.from(JSON.stringify({ uid, exp: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  return `${body}.${mac(body)}`;
}

/** The user id inside a valid, unexpired token, else null. */
export function readSession(token: string | undefined | null): number | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const want = Buffer.from(mac(body)), got = Buffer.from(sig);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return typeof p.uid === 'number' && p.exp > Date.now() ? p.uid : null;
  } catch { return null; }
}

export const cookieOptions = () => ({
  httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production' && process.env.COOKIE_SECURE !== 'false', path: '/', maxAge: MAX_AGE,
});

