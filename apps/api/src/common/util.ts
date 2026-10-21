// Money (integer centavos), Asia/Manila time helpers, small utilities. Ported from lib/util.js.
// Timestamps are 'YYYY-MM-DD HH:mm:ss' strings in Manila time, exactly like the original app stored them.
import * as crypto from 'crypto';

const TZ = 'Asia/Manila';
const dtf = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});

export const now = () => dtf.format(new Date());
export const today = () => now().slice(0, 10);
export const addDays = (d: string, n: number) => {
  const x = new Date(d + 'T00:00:00Z');
  x.setUTCDate(x.getUTCDate() + n);
  return x.toISOString().slice(0, 10);
};
export const dow = (d: string) => new Date(d + 'T00:00:00Z').getUTCDay(); // 0 = Sun
export const mins = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
};
export const tmins = (dt: string) => mins(dt.slice(11, 16));
export const diffMin = (a: string, b: string) =>
  Math.round((Date.parse(b.replace(' ', 'T') + 'Z') - Date.parse(a.replace(' ', 'T') + 'Z')) / 60000);
export const monthRange = (ym: string): [string, string] => {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${ym}-01`, `${ym}-${String(last).padStart(2, '0')}`];
};
export const validDate = (s: unknown) =>
  typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));

export const toCents = (s: unknown): number => {
  const n = Number(String(s ?? '').replace(/[₱,\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
};
export const plain = (c: number) => ((c || 0) / 100).toFixed(2);
export const hrs = (m: number) => (m / 60).toFixed(2);

export const rand = (n = 4) => {
  const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (const b of crypto.randomBytes(n)) s += A[b % A.length];
  return s;
};
export const str = (v: unknown, n = 500) => String(v ?? '').trim().slice(0, n);
export const intOrNull = (v: unknown) => (/^\d+$/.test(String(v ?? '')) ? Number(v) : null);
export const pad = (n: number, w = 5) => String(n).padStart(w, '0');

// Quote cells; neutralise spreadsheet formula injection (leading = + @ or non-numeric -).
const csvCell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^([=+@\t\r]|-(?!\d))/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
export const toCsv = (head: string[], rows: unknown[][]) =>
  '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
