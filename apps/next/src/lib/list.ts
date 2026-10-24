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

/** Safe ORDER BY from `?sort=&dir=`: `sortClause({ date: 'r.created_at', ... }, 'date', q)` */
export function sortClause(map: Record<string, string>, def: string, q: Record<string, string>) {
  const col = map[q.sort] || map[def];
  const dir = q.dir === 'asc' ? 'ASC' : 'DESC';
  return ` ORDER BY ${col} ${dir}, 1 DESC`;
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
