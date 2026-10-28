// Password hashing with Node's built-in scrypt. Stored as "scrypt$<salt hex>$<hash hex>".
import crypto from 'node:crypto';

const KEYLEN = 64;
const scrypt = (pw: string, salt: Buffer) =>
  new Promise<Buffer>((res, rej) => crypto.scrypt(pw.normalize(), salt, KEYLEN, { N: 16384, r: 8, p: 1 }, (e, k) => (e ? rej(e) : res(k))));

export async function hashPassword(pw: string) {
  const salt = crypto.randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${(await scrypt(pw, salt)).toString('hex')}`;
}

const DUMMY = hashPassword('not-a-real-password');
/** Constant-ish time: unknown users are checked against a dummy hash so timing does not reveal which usernames exist. */
export async function verifyPassword(pw: string, stored: string | null | undefined) {
  const [tag, saltHex, hashHex] = String(stored || (await DUMMY)).split('$');
  if (tag !== 'scrypt' || !saltHex || !hashHex) return false;
  const want = Buffer.from(hashHex, 'hex');
  const got = await scrypt(pw, Buffer.from(saltHex, 'hex'));
  return want.length === got.length && crypto.timingSafeEqual(want, got) && !!stored;
}

/** At least 8 characters, starting with a capital letter, and containing a number. */
export const strongEnough = (pw: string) => pw.length >= 8 && /^[A-Z]/.test(pw) && /\d/.test(pw);
export const PASSWORD_HINT = "At least 8 characters, starting with a capital letter, with at least one number.";
