import { useEffect, useMemo, useState } from 'react';
import { hrs, timeOf } from '../../../lib/format';
import Badge from '../../../ui/Badge';

export const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const dowOf = (day: string) => DOW[new Date(day + 'T00:00:00Z').getUTCDay()];

// Status colours exactly as the original attendance views mapped them.
const STATUS_CLS: Record<string, string> = {
  Present: 'b-ok', Late: 'b-warn', Absent: 'b-err', Incomplete: 'b-err', 'Clocked in': 'b-info', 'Approved leave': 'b-info',
};
export const StatusBadge = ({ status }: { status: string }) => <Badge cls={STATUS_CLS[status] ?? ''}>{status}</Badge>;

export interface Rec { id: number; user_id: number; day: string; time_in: string | null; time_out: string | null; is_late: number; late_min: number }
export interface DayRow { day: string; rec: Rec | null; scheduled: boolean; mins: number; status: string; late: boolean; late_min: number }
export interface PublicUser {
  id: number; emp_no: string; name: string; email: string; username: string; role: 'owner' | 'employee'; active: number; can_expenses: number;
  must_change_pw: number; sched_start: string; sched_end: string; grace_min: number; break_min: number; workdays: string; created_at: string;
}
export interface Summary {
  user: PublicUser; scheduled: number; days: number; absent: number; leave: number; holidays: number; late: number; incomplete: number;
  mins: number; avg: number; pct: number;
}

/** Philippine clock shown live, offset from the SERVER's time so a wrong PC clock cannot mislead (display only). */
export function Clock({ nowStr }: { nowStr: string }) {
  const offset = useMemo(() => Date.parse(nowStr.replace(' ', 'T') + '+08:00') - Date.now(), [nowStr]);
  const fmt = useMemo(() => new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
  }), []);
  const [, tick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);
  return <div className="clock">{fmt.format(new Date(Date.now() + offset))}</div>;
}

/** Time in / Time out card (original partials/clockcard.ejs). */
export function ClockCard({ name, rec, mins, nowStr, busy, onIn, onOut }: {
  name: string; rec: Rec | null; mins: number; nowStr: string; busy: boolean; onIn: () => void; onOut: () => void;
}) {
  return (
    <div className="card">
      <div className="muted small">Philippine time (Asia/Manila)</div>
      <Clock nowStr={nowStr} />
      <p><strong>{name}</strong> ·{' '}
        {!rec ? <span className="badge">Not timed in</span>
          : !rec.time_out ? (
            <>
              <span className="badge b-info">Clocked in {timeOf(rec.time_in)}</span>{' '}
              {rec.is_late ? <span className="badge b-warn">Late {rec.late_min} min</span> : <span className="badge b-ok">On time</span>}
            </>
          ) : <span className="badge b-ok">Done: {timeOf(rec.time_in)} – {timeOf(rec.time_out)} ({hrs(mins)} h)</span>}
      </p>
      <div className="row">
        <button className="btn" disabled={!!rec || busy} onClick={onIn}>Time In</button>
        <button className="btn alt" disabled={!rec || !!rec.time_out || busy} onClick={onOut}>Time Out</button>
      </div>
    </div>
  );
}

/** "08:00" for a stored 'YYYY-MM-DD HH:mm:ss', or an em dash. */
export const hm = (ts: string | null | undefined) => (ts ? ts.slice(11, 16) : '—');
