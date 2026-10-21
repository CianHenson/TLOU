import { User } from '../entities';

/** A user row without the password hash - the only shape that may leave the API. */
export const publicUser = (u: User) => {
  const { password_hash: _omit, ...rest } = u; // eslint-disable-line @typescript-eslint/no-unused-vars
  return rest;
};

/** summarize() returns the full user; swap it for the safe one. */
export const safeSummary = <S extends { user: User }>(s: S) => ({ ...s, user: publicUser(s.user) });

export const hm = (ts: string | null | undefined) => (ts ? ts.slice(11, 16) : '');

/** Last n months (YYYY-MM) ending at the month of `to`, oldest first - the original monthsBack(). */
export function monthsBack(to: string, n: number) {
  const out: string[] = [];
  let [y, m] = to.slice(0, 7).split('-').map(Number);
  for (let i = 0; i < n; i++) {
    out.unshift(`${y}-${String(m).padStart(2, '0')}`);
    if (--m === 0) { m = 12; y--; }
  }
  return out;
}
