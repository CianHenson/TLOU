// Attendance card (dashboards): Time In -> Break Out -> Break In -> Time Out. Each button is enabled only when the previous step
// is done; the server enforces the same order (lib/queries/clock.ts). `bar` renders the compact horizontal version.
import { ApiForm, Submit } from './form';
import { GeoForm } from './geo-form';
import { Clock } from './widgets';
import { Badge } from './ui';
import * as U from '@/lib/util';
import { hm12 } from '@/lib/util';
import { attStage, attIssue } from '@/lib/biz';
import type { Row } from '@/lib/types';

const hm = (s?: string | null) => hm12(s);

function Status({ rec, mins }: { rec: Row | null | undefined; mins: number }) {
  const st = attStage(rec);
  if (st === 'none') return <Badge>Not timed in</Badge>;
  if (st === 'done') return <Badge cls="b-ok">Done: {hm(rec!.time_in)} – {hm(rec!.time_out)} ({U.hrs(mins)} h)</Badge>;
  return <><Badge cls={st === 'break' ? 'b-warn' : 'b-info'}>{st === 'break' ? `On break since ${hm(rec!.break_out)}` : `Clocked in ${hm(rec!.time_in)}`}</Badge>{' '}
    {rec!.is_late ? <Badge cls="b-warn">Late {rec!.late_min} min</Badge> : <Badge cls="b-ok">On time</Badge>}</>;
}

/** The four recorded times of the day, so staff can see exactly what has been saved. */
function Times({ rec }: { rec: Row | null | undefined }) {
  const cell = (k: string, v?: string | null) => <span key={k}><small>{k}</small><b>{hm(v) || '—'}</b></span>;
  return <div className="cb-times" aria-label="Today's recorded times">
    {cell('Time in', rec?.time_in)}{cell('Break out', rec?.break_out)}{cell('Break in', rec?.break_in)}{cell('Time out', rec?.time_out)}
  </div>;
}

export function ClockCard({ name, rec, mins, bar = false }: { name: string; rec: Row | null | undefined; mins: number; bar?: boolean }) {
  const st = attStage(rec);
  const next = { none: 'Time In', in: 'Break Out', break: 'Break In', back: 'Time Out', done: '' }[st];
  const btn = (action: string, label: string, mine: typeof st, alt = false) => {
    const Form = mine === 'none' ? GeoForm : ApiForm; // Time In also sends the device location (must be at the office)
    return <Form action={action}><Submit className={alt ? 'btn alt' : 'btn'} disabled={st !== mine}>{label}</Submit></Form>;
  };
  const buttons = (
    <div className="row cb-btns">
      {btn('/api/attendance/in', 'Time In', 'none')}
      {btn('/api/attendance/break-out', 'Break Out', 'in', true)}
      {btn('/api/attendance/break-in', 'Break In', 'break', true)}
      {btn('/api/attendance/out', 'Time Out', 'back', true)}
    </div>
  );
  const hint = st === 'done' ? 'Attendance for today is complete.' : `Next step: ${next}`;
  if (bar) {
    return (
      <section className="clockbar" aria-label="Time in, breaks and time out">
        <div className="cb-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
        </div>
        <div className="cb-time"><Clock now={U.now()} split /><div className="cb-zone">Philippine time (Asia/Manila)</div></div>
        <div className="cb-who"><div className="cb-line"><strong>{name}</strong><Status rec={rec} mins={mins} /><span className="cb-hint">{hint}</span></div><Times rec={rec} /></div>
        {buttons}
      </section>
    );
  }
  return (
    <div className="card">
      <div className="muted small">Philippine time (Asia/Manila)</div>
      <Clock now={U.now()} />
      <p><strong>{name}</strong> · <Status rec={rec} mins={mins} /></p>
      <Times rec={rec} />
      <p className="small muted">{hint}{st === 'in' || st === 'break' || st === 'back' ? ` · ${attIssue(rec)}` : ''}</p>
      {buttons}
    </div>
  );
}
