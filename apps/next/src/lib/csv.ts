// CSV import helpers (Batch Upload). Pure functions, safe on server and client.

/** Parse CSV text (RFC 4180 quoting, CRLF / LF, optional BOM). Returns every non-empty row as an array of cells. */
export function parseCsv(text: string): string[][] {
  const s = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [], cell = '', q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"') { if (s[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += c;
    } else if (c === '"' && cell === '') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && s[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some((x) => x.trim() !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  if (q) throw new Error('The file has an unclosed quote. Check the CSV and try again.');
  row.push(cell);
  if (row.some((x) => x.trim() !== '')) rows.push(row);
  return rows;
}

/** Header normaliser: "Check-in Status", "checkin_status" and "CHECKIN STATUS" all become "checkinstatus". */
export const headKey = (h: string) => h.replace(/^﻿/, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** Undo the apostrophe our own CSV export puts in front of cells that look like spreadsheet formulas. */
export const unquoteCell = (v: string) => v.trim().replace(/^'(?=[=+@\t\r-])/, '');

export interface CsvColumn { key: string; label: string; required?: boolean; aliases?: string[]; example?: string }

export const MAX_CSV_BYTES = 1024 * 1024;
export const MAX_CSV_ROWS = 500;

/**
 * Validate an uploaded CSV before anything is processed: CSV file only, size, header columns (all required ones present,
 * nothing unknown, no duplicates), row length. Returns the rows as { key: value } plus their CSV line numbers, or `error`.
 */
export async function readCsvUpload(file: FormDataEntryValue | undefined, cols: CsvColumn[]): Promise<
  { error: string } | { rows: { line: number; v: Record<string, string> }[] }> {
  if (!file || typeof file === 'string' || !file.size) return { error: 'Choose a CSV file to upload.' };
  if (!/\.csv$/i.test(file.name) || (file.type && !/^(text\/csv|text\/plain|application\/(vnd\.ms-excel|csv))$/i.test(file.type))) return { error: 'Only CSV files (.csv) can be uploaded.' };
  if (file.size > MAX_CSV_BYTES) return { error: 'The file is too large (maximum 1 MB).' };
  const text = await file.text();
  if (text.includes('\u0000')) return { error: 'This does not look like a CSV text file.' };
  let all: string[][];
  try { all = parseCsv(text); } catch (e) { return { error: (e as Error).message }; }
  if (all.length < 2) return { error: all.length ? 'The file has a header row but no records.' : 'The file is empty.' };
  if (all.length - 1 > MAX_CSV_ROWS) return { error: `Too many rows: upload at most ${MAX_CSV_ROWS} records at a time.` };

  const lookup = new Map<string, CsvColumn>();
  for (const c of cols) for (const k of [c.key, c.label, ...(c.aliases ?? [])]) lookup.set(headKey(k), c);
  const idx: (CsvColumn | null)[] = all[0].map((h) => lookup.get(headKey(h)) ?? null);
  const unknown = all[0].filter((_, i) => !idx[i]).map((h) => h.trim() || '(blank)');
  const seen = idx.filter(Boolean) as CsvColumn[];
  const dupes = seen.filter((c, i) => seen.indexOf(c) !== i).map((c) => c.label);
  const missing = cols.filter((c) => c.required && !seen.includes(c)).map((c) => c.label);
  if (missing.length || unknown.length || dupes.length) {
    return { error: [missing.length && `Missing column${missing.length > 1 ? 's' : ''}: ${missing.join(', ')}.`, unknown.length && `Unrecognised column${unknown.length > 1 ? 's' : ''}: ${unknown.join(', ')}.`,
      dupes.length && `Repeated column${dupes.length > 1 ? 's' : ''}: ${dupes.join(', ')}.`, `Expected columns: ${cols.map((c) => c.label + (c.required ? '*' : '')).join(', ')} (* = required).`].filter(Boolean).join(' ') };
  }
  const rows = all.slice(1).map((cells, i) => {
    const v: Record<string, string> = Object.fromEntries(cols.map((c) => [c.key, '']));
    cells.forEach((x, j) => { const c = idx[j]; if (c) v[c.key] = unquoteCell(x); });
    return { line: i + 2, v, extra: cells.length > all[0].length };
  });
  const wide = rows.find((r) => r.extra);
  if (wide) return { error: `Row ${wide.line} has more values than the header has columns. Check for stray commas (wrap text containing commas in quotes).` };
  return { rows: rows.map(({ line, v }) => ({ line, v })) };
}

/** A CSV template (header + one example row) for download. */
export const templateCsv = (cols: CsvColumn[]) => '﻿' + [cols.map((c) => c.label), cols.map((c) => c.example ?? '')].map((r) => r.map((x) => (/[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x)).join(',')).join('\r\n') + '\r\n';
