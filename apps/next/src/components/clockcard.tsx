// Time in / time out card (dashboards + My Attendance). Posts to POST /api/attendance/in and /api/attendance/out.
import { ApiForm, Submit } from './form';
import { Clock } from './widgets';
import { Badge } from './ui';
import * as U from '@/lib/util';
import type { Row } from '@/lib/types';

export function ClockCard({ name, rec, mins }: { name: string; rec: Row | null | undefined; mins: number }) {
  return (
    <div className="card">
      <div className="muted small">Philippine time (Asia/Manila)</div>
      <Clock now={U.now()} />
      <p>
        <strong>{name}</strong> ·{' '}
        {!rec ? <Badge>Not timed in</Badge>
          : !rec.time_out ? <><Badge cls="b-info">Clocked in {rec.time_in.slice(11, 16)}</Badge>{' '}{rec.is_late ? <Badge cls="b-warn">Late {rec.late_min} min</Badge> : <Badge cls="b-ok">On time</Badge>}</>
          : <Badge cls="b-ok">Done: {rec.time_in.slice(11, 16)} – {rec.time_out.slice(11, 16)} ({U.hrs(mins)} h)</Badge>}
      </p>
      <div className="row">
        <ApiForm action="/api/attendance/in"><Submit disabled={!!rec}>Time In</Submit></ApiForm>
        <ApiForm action="/api/attendance/out"><Submit className="btn alt" disabled={!rec || !!rec.time_out}>Time Out</Submit></ApiForm>
      </div>
    </div>
  );
}
