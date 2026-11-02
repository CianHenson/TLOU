// Filtered / sorted / paginated list queries driven by URL search params. Server-only.
import 'server-only';
import { db } from './db';
import type { Row } from './types';

export type SP = Record<string, string | string[] | undefined>;
/** Flatten Next's searchParams (first value wins) into plain strings. */
export const flat = (sp: SP): Record<string, string> => Object.fromEntries(Object.entries(sp).map(([k, v]) => [k, (Array.isArray(v) ? v[0] : v) ?? '']));

export interface Page<T = Row> { rows: T[]; total: number; page: number; pages: number; qs: string }

/**
 * `sql` must be a complete SELECT without LIMIT. Pass the flattened search params `q` (uses `page`).
 * `qs` is the query string without page/export, for building pager and sort links.
 */
export async function paginate<T = Row>(q: Record<string, string>, sql: string, params: unknown[], per = 20): Promise<Page<T>> {
  const total = (await db.val(`SELECT COUNT(*) FROM (${sql}) AS cnt`, params)) ?? 0;
  const pages = Math.max(1, Math.ceil(total / per));
  const page = Math.min(pages, Math.max(1, parseInt(q.page, 10) || 1));
  const rows = await db.all<T>(`${sql} LIMIT ${per} OFFSET ${(page - 1) * per}`, params);
  const qs = new URLSearchParams(q); qs.delete('page'); qs.delete('export');
  return { rows, total, page, pages, qs: qs.toString() };
}

/** Safe ORDER BY from `?sort=&dir=` (and `?group=`, whose SQL goes first): `sortClause({ date: 'r.created_at', ... }, 'date', q, { status: 'r.status' })` */
export function sortClause(map: Record<string, string>, def: string, q: Record<string, string>, groups?: Record<string, string>) {
  const col = map[q.sort] || map[def];
  const dir = q.dir === 'asc' ? 'ASC' : 'DESC';
  const g = groups?.[q.group];
  return ` ORDER BY ${g ? g + ', ' : ''}${col} ${dir}, 1 DESC`;
}

/**
 * ORDER BY for lists sorted from the right-click menu: `?group=` (SQL in `groups`, put first so the rows come out grouped),
 * then `?sort=&dir=` (SQL in `sorts`), otherwise `fallback` (the list's normal order). Both keys are whitelisted. `tie` follows a chosen sort.
 */
export function orderBy(q: Record<string, string>, sorts: Record<string, string>, groups: Record<string, string> | undefined, fallback: string, tie = '') {
  const parts: string[] = [];
  const g = groups?.[q.group];
  if (g) parts.push(g);
  const s = sorts[q.sort];
  if (s) { parts.push(`${s} ${q.dir === 'asc' ? 'ASC' : 'DESC'}`); if (tie) parts.push(tie); } else parts.push(fallback);
  return 'ORDER BY ' + parts.join(', ');
}

type Key<T> = (r: T) => string | number | null | undefined;
const cmp = (a: unknown, b: unknown) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a ?? '').localeCompare(String(b ?? ''), undefined, { numeric: true, sensitivity: 'base' }));

/**
 * The in-memory version of orderBy, for lists that are built in code rather than by one SQL query (attendance, payroll):
 * rows grouped by `?group=` first (the group's sortable key; `desc` for newest-first groups), then `?sort=&dir=`.
 * The sort is stable, so ties keep the list's normal order.
 */
export function sortRows<T>(rows: T[], q: Record<string, string>, sorts: Record<string, Key<T>>, groups?: Record<string, { key: Key<T>; desc?: boolean }>): T[] {
  const g = groups?.[q.group], k = sorts[q.sort], dir = q.dir === 'asc' ? 1 : -1;
  if (!g && !k) return rows;
  return [...rows].sort((a, b) => (g ? (g.desc ? -1 : 1) * cmp(g.key(a), g.key(b)) : 0) || (k ? dir * cmp(k(a), k(b)) : 0));
}

/** Collects WHERE fragments: `const f = where(); f.add('c.name LIKE ?', '%x%')` -> f.sql ('' or 'WHERE ...'), f.p */
export function where() {
  const w: string[] = [], p: unknown[] = [];
  return {
    add(cond: string, ...params: unknown[]) { w.push(cond); p.push(...params); },
    get sql() { return w.length ? 'WHERE ' + w.join(' AND ') : ''; },
    get and() { return w.length ? 'AND ' + w.join(' AND ') : ''; },
    get p() { return p; },
  };
}
