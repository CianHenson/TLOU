// Staff dashboard: month calendar of the signed-in user's own attendance. Worked days are highlighted; hovering one shows
// the time in / out and the hours rendered; clicking it opens My Attendance on that day (the row pulses there).
import Link from 'next/link';
import * as U from '@/lib/util';
import type { DayRow } from '@/lib/biz';

const hm = (s?: string | null) => (s ? s.slice(11, 16) : '');
const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function StaffCalendar({ ym, rows, today }: { ym: string; rows: DayRow[]; today: string }) {
  const [from, to] = U.monthRange(ym);
  const by = new Map(rows.map((r) => [r.day, r]));
  const lead = U.dow(from), last = Number(to.slice(8));
  const total = rows.reduce((a, r) => a + r.mins, 0), worked = rows.filter((r) => r.rec?.time_in).length;
  const prev = U.addDays(from, -1).slice(0, 7), next = U.addDays(to, 1).slice(0, 7);
  const title = new Date(from + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: last }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`)];
  return (
    <div className="card cal">
      <div className="cal-head">
        <h3>{title}</h3>
        <span className="cal-nav">
          <Link href={`/app?cal=${prev}`} aria-label="Previous month">‹</Link>
          {ym !== today.slice(0, 7) && <Link href="/app" className="cal-today">Today</Link>}
          {next <= today.slice(0, 7) && <Link href={`/app?cal=${next}`} aria-label="Next month">›</Link>}
        </span>
      </div>
      <div className="cal-grid" role="grid" aria-label={`Attendance for ${title}`}>
        {NAMES.map((n) => <div key={n} className="cal-dow" role="columnheader">{n}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} className="cal-d empty" />;
          const r = by.get(d), did = !!r?.rec?.time_in, col = i % 7;
          const cls = `cal-d${did ? ' work' : ''}${d === today ? ' today' : ''}${r?.status === 'Absent' ? ' absent' : ''}${r?.late && did ? ' late' : ''}${col < 2 ? ' tip-l' : col > 4 ? ' tip-r' : ''}`;
          const num = Number(d.slice(8));
          if (!did) return <div key={d} className={cls} title={r?.status === 'Absent' ? 'Absent' : undefined}>{num}</div>;
          return (
            <Link key={d} className={cls} href={`/app/attendance?month=${ym}&hl=${d}`}>
              {num}
              <span className="cal-tip" role="tooltip">
                <b>{U.longDate(d)}</b>
                <span>In <em>{hm(r!.rec!.time_in)}</em> · Out <em>{hm(r!.rec!.time_out) || 'not yet'}</em></span>
                <span>{r!.mins ? `${U.hrs(r!.mins)} hrs rendered` : 'Hours pending'}{r!.late ? ` · late ${r!.late_min} min` : ''}</span>
              </span>
            </Link>
          );
        })}
      </div>
      <div className="cal-foot"><span><i className="work" /> Worked</span><span><i className="absent" /> Absent</span><b>{worked} day{worked === 1 ? '' : 's'} · {U.hrs(total)} hrs this month</b></div>
    </div>
  );
}
