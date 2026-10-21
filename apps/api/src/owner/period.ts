import { addDays, diffMin, monthRange, today, validDate } from '../common/util';

export interface Period { from: string; to: string; key: string }

// Resolve a period selection (day/month/quarter/year/custom) to [from,to]. Ported from routes/owner.js.
export function period(q: Record<string, unknown>): Period {
  const t = today();
  const from0 = String(q.from ?? '');
  const to0 = String(q.to ?? '');
  let from: string;
  let to: string;
  let key = String(q.period ?? '');
  switch (key) {
    case 'day': from = to = validDate(from0) ? from0 : t; break;
    case 'quarter': {
      const m = Number(t.slice(5, 7));
      const s = Math.floor((m - 1) / 3) * 3 + 1;
      from = `${t.slice(0, 4)}-${String(s).padStart(2, '0')}-01`;
      to = monthRange(`${t.slice(0, 4)}-${String(s + 2).padStart(2, '0')}`)[1];
      break;
    }
    case 'year': from = `${t.slice(0, 4)}-01-01`; to = `${t.slice(0, 4)}-12-31`; break;
    case 'custom': from = validDate(from0) ? from0 : t.slice(0, 7) + '-01'; to = validDate(to0) ? to0 : t; break;
    default: [from, to] = monthRange(t.slice(0, 7)); key = 'month';
  }
  if (to < from) [from, to] = [to, from];
  if (diffMin(from + ' 00:00:00', to + ' 00:00:00') > 366 * 1440) from = addDays(to, -366);
  return { from, to, key };
}

export const monthsBack = (to: string, n: number) => {
  const out: string[] = [];
  let [y, m] = to.slice(0, 7).split('-').map(Number);
  for (let i = 0; i < n; i++) {
    out.unshift(`${y}-${String(m).padStart(2, '0')}`);
    if (--m === 0) { m = 12; y--; }
  }
  return out;
};
