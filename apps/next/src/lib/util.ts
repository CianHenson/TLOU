// Money (integer centavos), Asia/Manila time helpers, small utilities. Pure functions - safe on server and client.
export const TZ = 'Asia/Manila';

const dtf = new Intl.DateTimeFormat('sv-SE', {
  timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
});
/** 'YYYY-MM-DD HH:mm:ss' in Manila time. All timestamps are generated server-side with this. */
export const now = () => dtf.format(new Date()).replace(/[  ]/g, ' ');
export const today = () => now().slice(0, 10);
export const addDays = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
export const dow = (d: string) => new Date(d + 'T00:00:00Z').getUTCDay(); // 0 = Sunday
export const mins = (hhmm: string) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
export const tmins = (dt: string) => mins(dt.slice(11, 16));
export const diffMin = (a: string, b: string) => Math.round((Date.parse(b.replace(' ', 'T') + 'Z') - Date.parse(a.replace(' ', 'T') + 'Z')) / 60000);
export const monthRange = (ym: string): [string, string] => {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return [`${ym}-01`, `${ym}-${String(last).padStart(2, '0')}`];
};
/** The n calendar months ending with the month of `to` (oldest first), as 'YYYY-MM'. */
export const monthsBack = (to: string, n: number) => {
  const out: string[] = []; let [y, m] = to.slice(0, 7).split('-').map(Number);
  for (let i = 0; i < n; i++) { out.unshift(`${y}-${String(m).padStart(2, '0')}`); if (--m === 0) { m = 12; y--; } }
  return out;
};

export const toCents = (s: unknown) => {
  const n = Number(String(s ?? '').replace(/[₱,\s]/g, ''));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
};
export const peso = (c: number | null | undefined) => '₱' + ((c || 0) / 100).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const plain = (c: number | null | undefined) => ((c || 0) / 100).toFixed(2);
export const hrs = (m: number) => (m / 60).toFixed(2);

export const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
export const isEmail = (s: string) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s);
export const str = (v: unknown, n = 500) => String(v ?? '').trim().slice(0, n);
export const intOrNull = (v: unknown) => (/^\d+$/.test(String(v ?? '')) ? Number(v) : null);

const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const rand = (n = 4) => {
  const b = new Uint8Array(n); crypto.getRandomValues(b);
  return Array.from(b, (x) => A[x % A.length]).join('');
};

/** Quote CSV cells; neutralise spreadsheet formula injection (leading = + @ or non-numeric -). */
export const csvCell = (v: unknown) => {
  let s = String(v ?? '');
  if (/^([=+@\t\r]|-(?!\d))/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
};
export const toCsv = (head: unknown[], rows: unknown[][]) => '﻿' + [head, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
/** 2026-10-26 -> October 26, 2026 */
export const longDate = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
/**
 * Display-only 12-hour time ("2:30 PM") from a stored 'HH:mm' time or 'YYYY-MM-DD HH:mm[:ss]' timestamp; '' when empty.
 * Stored values stay 24-hour so sorting and calculations are unaffected.
 */
export const hm12 = (v: string | null | undefined) => {
  if (!v) return '';
  const t = v.length > 5 ? v.slice(11, 16) : v.slice(0, 5);
  if (!/^\d{2}:\d{2}$/.test(t)) return '';
  const h = +t.slice(0, 2);
  return `${h % 12 || 12}:${t.slice(3, 5)} ${h < 12 ? 'AM' : 'PM'}`;
};
export const time12 = hm12;
/** "2026-10-31 3:55 PM" from a stored timestamp (date + 12-hour time). */
export const dt12 = (s: string | null | undefined) => (s ? `${s.slice(0, 10)} ${hm12(s)}`.trim() : '');
/** Accepts "8:30 AM", "8:30pm" or "08:30" (CSV uploads) and returns 'HH:mm' (24 h, as stored), or '' when it is not a time. */
export const to24h = (s: string) => {
  const m = /^(\d{1,2}):(\d{2})\s*([ap]m)?$/i.exec(String(s ?? '').trim());
  if (!m) return '';
  let h = +m[1];
  if (m[3]) { if (h < 1 || h > 12) return ''; h = (h % 12) + (m[3].toLowerCase() === 'pm' ? 12 : 0); }
  return h > 23 || +m[2] > 59 ? '' : `${String(h).padStart(2, '0')}:${m[2]}`;
};
