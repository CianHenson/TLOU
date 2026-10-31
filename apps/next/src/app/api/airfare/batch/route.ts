import { api, ok, fail, form, clientIp } from '@/lib/http';
import { apiUser } from '@/lib/auth';
import { db, tx } from '@/lib/db';
import { audit } from '@/lib/biz';
import { now, to24h } from '@/lib/util';
import { readCsvUpload } from '@/lib/csv';
import { AIRFARE_COLS } from '@/lib/batch-cols';
import { CHECKIN_STATUSES } from '@/lib/types';
import { airfareInput } from '@/lib/queries/airfare';
import { activeAirlineNames } from '@/lib/queries/airlines';

/**
 * Batch Upload of airfare sales from a CSV file. The whole file is validated first (format, columns, every row, airline against
 * the active Airlines list, duplicate PNRs in the file and in the system); if anything is wrong nothing is imported and the
 * rows at fault are listed, so a file is never half-imported.
 */
export const POST = api(async (req) => {
  const user = await apiUser();
  const { b } = await form(req);
  const csv = await readCsvUpload(b.file, AIRFARE_COLS);
  if ('error' in csv) return fail(csv.error, 422, { File: csv.error });

  const airlines = new Map((await activeAirlineNames()).map((n) => [n.toLowerCase(), n]));
  const errors: Record<string, string> = {};
  const good: ReturnType<typeof airfareInput>['a'][] = [];
  const filePnr = new Map<string, number>();
  const known = new Map((await db.all<{ pnr: string; passenger: string }>('SELECT pnr, passenger FROM airfare_sales WHERE pnr IN (?)', [csv.rows.map((r) => r.v.pnr.toUpperCase()).filter(Boolean).concat('-')])).map((r) => [r.pnr.toUpperCase(), r.passenger]));
  for (const { line, v } of csv.rows) {
    const status = CHECKIN_STATUSES.find((s) => s.toLowerCase() === v.checkin_status.toLowerCase()) ?? (v.checkin_status ? v.checkin_status : 'Pending');
    const { a, errors: e } = airfareInput({ ...v, checkin_status: status, travel_time: v.travel_time ? to24h(v.travel_time) || v.travel_time : '' });
    const airline = airlines.get(a.airline.toLowerCase());
    if (a.airline && !airline) e.airline = `"${a.airline}" is not an active airline (add it on the Airlines page first).`;
    else if (airline) a.airline = airline;
    if (!e.pnr) {
      if (known.has(a.pnr)) e.pnr = `PNR ${a.pnr} is already recorded for ${known.get(a.pnr)}.`;
      else if (filePnr.has(a.pnr)) e.pnr = `PNR ${a.pnr} is repeated (first on row ${filePnr.get(a.pnr)}).`;
      else filePnr.set(a.pnr, line);
    }
    const bad = Object.entries(e);
    if (bad.length) errors[`Row ${line}`] = bad.map(([k, m]) => `${AIRFARE_COLS.find((c) => c.key === k)?.label ?? k}: ${m}`).join(' ');
    else good.push(a);
  }
  const bad = Object.keys(errors).length;
  if (bad) return fail(`Nothing was imported: ${bad} row${bad === 1 ? ' has' : 's have'} problems. Fix the file and upload it again.`, 422, errors);

  await tx(async (d) => {
    for (const a of good) {
      await d.run(`INSERT INTO airfare_sales (txn_date,airline,pnr,pax,passenger,contact,email_fb,origin,destination,travel_date,travel_time,
        checkin_status,flight_no,total_amount,service_charge,card_fee,remarks,user_id,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        [a.txn_date, a.airline, a.pnr, a.pax, a.passenger, a.contact, a.email_fb, a.origin, a.destination, a.travel_date, a.travel_time || null,
          a.checkin_status, a.flight_no, a.total_amount, a.service_charge, a.card_fee, a.remarks, user.id, now()]);
    }
  });
  await audit({ user, ip: clientIp(req) }, 'airfare.batch', 'airfare', null, { rows: good.length });
  return ok(`${good.length} airfare sale${good.length === 1 ? '' : 's'} imported.`, { count: good.length });
});
