// Time in / time out card (dashboards + My Attendance). Posts to POST /api/attendance/in and /api/attendance/out.
// `bar` renders the compact horizontal version used on the dashboards.
import { ApiForm, Submit } from './form';
import { Clock } from './widgets';
import { Badge } from './ui';
import * as U from '@/lib/util';
import type { Row } from '@/lib/types';

function Status({ rec, mins }: { rec: Row | null | undefined; mins: number }) {
  if (!rec) return <Badge>Not timed in</Badge>;
  if (!rec.time_out) return <><Badge cls="b-info">Clocked in {rec.time_in.slice(11, 16)}</Badge>{' '}{rec.is_late ? <Badge cls="b-warn">Late {rec.late_min} min</Badge> : <Badge cls="b-ok">On time</Badge>}</>;
  return <Badge cls="b-ok">Done: {rec.time_in.slice(11, 16)} – {rec.time_out.slice(11, 16)} ({U.hrs(mins)} h)</Badge>;
}

export function ClockCard({ name, rec, mins, bar = false }: { name: string; rec: Row | null | undefined; mins: number; bar?: boolean }) {
  const buttons = (
    <div className="row">
      <ApiForm action="/api/attendance/in"><Submit disabled={!!rec}>Time In</Submit></ApiForm>
      <ApiForm action="/api/attendance/out"><Submit className="btn alt" disabled={!rec || !!rec.time_out}>Time Out</Submit></ApiForm>
    </div>
  );
  if (bar) {
    return (
      <section className="clockbar" aria-label="Time in and time out">
        <div className="cb-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
        </div>
        <div className="cb-time"><Clock now={U.now()} split /><div className="cb-zone">Philippine time (Asia/Manila)</div></div>
        <div className="cb-who"><strong>{name}</strong><div><Status rec={rec} mins={mins} /></div></div>
        {buttons}
      </section>
    );
  }
  return (
    <div className="card">
      <div className="muted small">Philippine time (Asia/Manila)</div>
      <Clock now={U.now()} />
      <p><strong>{name}</strong> · <Status rec={rec} mins={mins} /></p>
      {buttons}
    </div>
  );
}
