// Staff dashboard: the signed-in user's own attendance for the current month and the upcoming one side by side (so the turn
// of the month, e.g. October to November, is visible at a glance). Worked days are highlighted; hovering a day shows the
// recorded times and hours; clicking any day up to today opens My Attendance with that day selected.
import Link from 'next/link';
import * as U from '@/lib/util';
import type { DayRow } from '@/lib/biz';

const hm = (s?: string | null) => U.hm12(s);
const NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
/** Furthest month the calendar can move forward to: 12 months after the current one. */
export const maxMonth = (cur: string) => { const [y, m] = cur.split('-').map(Number); const t = y * 12 + (m - 1) + 12; return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, '0')}`; };
const nextMonth = (ym: string) => U.addDays(U.monthRange(ym)[1], 1).slice(0, 7);
const longMonth = (ym: string) => new Date(ym + '-01T00:00:00Z').toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });

function Month({ ym, by, today }: { ym: string; by: Map<string, DayRow>; today: string }) {
  const [from, to] = U.monthRange(ym);
  const lead = U.dow(from), last = Number(to.slice(8));
  const cells: (string | null)[] = [...Array(lead).fill(null), ...Array.from({ length: last }, (_, i) => `${ym}-${String(i + 1).padStart(2, '0')}`)];
  const title = longMonth(ym);
  return (
    <div className="cal-month">
      <h4>{title}</h4>
      <div className="cal-grid" role="grid" aria-label={`Attendance for ${title}`}>
        {NAMES.map((n) => <div key={n} className="cal-dow" role="columnheader">{n}</div>)}
        {cells.map((d, i) => {
          if (!d) return <div key={`e${i}`} className="cal-d empty" />;
          const r = by.get(d), did = !!r?.rec?.time_in, col = i % 7, future = d > today;
          const row = Math.floor(i / 7);
          const cls = `cal-d${row < 2 ? ' tip-b' : ''}${did ? ' work' : ''}${d === today ? ' today' : ''}${r?.status === 'Absent' ? ' absent' : ''}${r?.late && did ? ' late' : ''}${future ? ' future' : ''}${col < 2 ? ' tip-l' : col > 4 ? ' tip-r' : ''}`;
          const num = Number(d.slice(8));
          if (future) return <div key={d} className={cls} title="Upcoming">{num}</div>;
          return (
            <Link key={d} className={cls} href={`/app/attendance?month=${ym}&hl=${d}`} aria-label={`${U.longDate(d)}${r ? ': ' + r.status : ''}`}>
              {num}
              <span className="cal-tip" role="tooltip">
                <b>{U.longDate(d)}</b>
                <span className="cal-st">{r?.status ?? 'No record'}</span>
                {did ? <>
                  <span className="cal-row"><i>Time in</i><em>{hm(r!.rec!.time_in) || '—'}</em></span>
                  <span className="cal-row"><i>Break out</i><em>{hm(r!.rec!.break_out) || '—'}</em></span>
                  <span className="cal-row"><i>Break in</i><em>{hm(r!.rec!.break_in) || '—'}</em></span>
                  <span className="cal-row"><i>Time out</i><em>{hm(r!.rec!.time_out) || 'Not yet'}</em></span>
                  {r!.late && <span className="cal-row"><i>Late by</i><em>{r!.late_min} min</em></span>}
                  <span className="cal-row"><i>Hours worked</i><em>{r!.rec!.time_out ? U.hrs(r!.mins) : 'Pending'}</em></span>
                  {r!.issue && <span className="cal-warn">{r!.issue}</span>}
                </> : <span className="cal-none">No attendance recorded</span>}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

/** One month at a time: `ym` is the month shown and `rows` its daily rows. The left / right buttons move to the previous / next month. */
export function StaffCalendar({ ym, rows, today }: { ym: string; rows: DayRow[]; today: string }) {
  const by = new Map(rows.map((r) => [r.day, r]));
  const cur = today.slice(0, 7), next = nextMonth(ym);
  const total = rows.reduce((a, r) => a + r.mins, 0), worked = rows.filter((r) => r.rec?.time_in).length;
  const prev = U.addDays(`${ym}-01`, -1).slice(0, 7);
  return (
    <div className="card cal">
      <div className="cal-head">
        <h3>Attendance calendar</h3>
        <span className="cal-nav">
          <Link href={`/app?cal=${prev}`} aria-label="Previous month">‹</Link>
          {ym !== cur && <Link href="/app" className="cal-today">Today</Link>}
          {next <= maxMonth(cur) && <Link href={`/app?cal=${next}`} aria-label="Next month">›</Link>}
        </span>
      </div>
      <div className="cal-months"><Month ym={ym} by={by} today={today} /></div>
      <div className="cal-foot"><span><i className="work" /> Worked</span><span><i className="absent" /> Absent</span><b>{worked} day{worked === 1 ? '' : 's'} · {U.hrs(total)} hrs this month</b></div>
    </div>
  );
}
