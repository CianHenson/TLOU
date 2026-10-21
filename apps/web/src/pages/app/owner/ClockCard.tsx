import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { timeOf } from '../../../lib/format';

export interface Clock {
  name: string; now: string; hours: string; mins: number;
  rec: { time_in: string | null; time_out: string | null; is_late: number; late_min: number } | null;
}

const fmt = new Intl.DateTimeFormat('en-PH', {
  timeZone: 'Asia/Manila', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true,
});

/** Today's attendance status with a live Manila clock (offset from the server time, display only). */
export default function ClockCard({ clock }: { clock: Clock }) {
  const offset = Date.parse(clock.now.replace(' ', 'T') + '+08:00') - Date.now();
  const [text, setText] = useState(clock.now);
  useEffect(() => {
    const tick = () => setText(fmt.format(new Date(Date.now() + offset)));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [offset]);
  const rec = clock.rec;

  return (
    <div className="card">
      <div className="muted small">Philippine time (Asia/Manila)</div>
      <div className="clock">{text}</div>
      <p>
        <strong>{clock.name}</strong> ·{' '}
        {!rec ? <span className="badge">Not timed in</span>
          : !rec.time_out ? (
            <>
              <span className="badge b-info">Clocked in {timeOf(rec.time_in)}</span>{' '}
              {rec.is_late ? <span className="badge b-warn">Late {rec.late_min} min</span> : <span className="badge b-ok">On time</span>}
            </>
          ) : <span className="badge b-ok">Done: {timeOf(rec.time_in)} – {timeOf(rec.time_out)} ({clock.hours} h)</span>}
      </p>
      <Link className="btn" to="/app/attendance">{!rec ? 'Time in / out' : 'Open My Attendance'}</Link>
    </div>
  );
}
