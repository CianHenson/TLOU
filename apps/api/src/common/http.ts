import { Response } from 'express';
import { UnprocessableEntityException } from '@nestjs/common';
import { today, toCsv } from './util';

// Field-level validation failure. The web app reads `errors` and shows each message under its field.
export const invalid = (errors: Record<string, string>, message = 'Please fix the highlighted fields.') =>
  new UnprocessableEntityException({ statusCode: 422, message, errors });

export interface Page<T> { rows: T[]; total: number; page: number; pages: number }

// In-memory equivalent of the original paginate(): 1-based page, clamped.
export function paginate<T>(all: T[], query: Record<string, unknown>, per = 20): Page<T> {
  const total = all.length;
  const pages = Math.max(1, Math.ceil(total / per));
  const page = Math.min(pages, Math.max(1, parseInt(String(query.page ?? ''), 10) || 1));
  return { rows: all.slice((page - 1) * per, page * per), total, page, pages };
}

// Sort rows by a whitelisted key map, like the original SORTS() helper. dir=asc|desc (default desc).
export function sortRows<T>(rows: T[], query: Record<string, unknown>, keys: Record<string, (r: T) => string | number | null | undefined>, def: string): T[] {
  const get = keys[String(query.sort)] ?? keys[def];
  const dir = query.dir === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const x = get(a) ?? '', y = get(b) ?? '';
    return (x < y ? -1 : x > y ? 1 : 0) * dir;
  });
}

export function sendCsv(res: Response, name: string, head: string[], rows: unknown[][]) {
  res.set({
    'Content-Type': 'text/csv; charset=utf-8',
    'Content-Disposition': `attachment; filename="${name}-${today()}.csv"`,
  });
  res.send(toCsv(head, rows));
}
