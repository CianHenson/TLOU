'use client';
// My Attendance → "View Schedule": a modal with a month calendar of the employee's own schedule. Each scheduled workday shows
// the time they are required to time in and out; rest days are dimmed and approved leave / holidays are marked.
import { useState } from 'react';
import { WEEKDAYS } from '@/lib/types';
import { Modal } from './modal';

export interface Sched { start: string; end: string; grace: number; brk: number; days: number[] }
export interface Off { day: string; kind: string; note: string | null }

const pad = (n: number) => String(n).padStart(2, '0');
const t12 = (t: string) => { const [h, m] = t.split(':').map(Number); return `${h % 12 || 12}:${pad(m)} ${h < 12 ? 'AM' : 'PM'}`; };

function Calendar({ sched, off, today }: { sched: Sched; off: Off[]; today: string }) {
  const [ym, setYm] = useState(today.slice(0, 7));
  const [y, m] = ym.split('-').map(Number);
  const lead = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const step = (n: number) => { const d = new Date(Date.UTC(y, m - 1 + n, 1)); setYm(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`); };
  const offBy = new Map(off.map((o) => [o.day, o]));
  const title = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const cells: (number | null)[] = [...Array(lead).fill(null), ...Array.from({ length: last }, (_, i) => i + 1)];
  return (
    <>
      <div className="cal-head">
        <h3>{title}</h3>
        <span className="cal-nav">
          <button type="button" className="cal-btn" aria-label="Previous month" onClick={() => step(-1)}>‹</button>
          {ym !== today.slice(0, 7) && <button type="button" className="cal-btn cal-today" onClick={() => setYm(today.slice(0, 7))}>Today</button>}
          <button type="button" className="cal-btn" aria-label="Next month" onClick={() => step(1)}>›</button>
        </span>
      </div>
      <div className="cal-grid sch-grid" role="grid" aria-label={`Schedule for ${title}`}>
        {WEEKDAYS.map((n) => <div key={n} className="cal-dow" role="columnheader">{n}</div>)}
        {cells.map((n, i) => {
          if (!n) return <div key={`e${i}`} className="cal-d empty" />;
          const day = `${ym}-${pad(n)}`, dow = (lead + n - 1) % 7, o = offBy.get(day), work = sched.days.includes(dow);
          const cls = `cal-d sch-d${work && !o ? ' sch-work' : ''}${o ? ' sch-off' : ''}${day === today ? ' today' : ''}`;
          return (
            <div key={day} className={cls}>
              <b>{n}</b>
              {o ? <span>{o.kind === 'Holiday' ? 'Holiday' : 'Leave'}</span> : work ? <span>{t12(sched.start)}<br />{t12(sched.end)}</span> : <span>Rest day</span>}
            </div>
          );
        })}
      </div>
    </>
  );
}

export function ViewScheduleButton({ sched, off, today }: { sched: Sched; off: Off[]; today: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn ghost" onClick={() => setOpen(true)} aria-haspopup="dialog">View Schedule</button>
      {open && (
        <Modal title="My schedule" onClose={() => setOpen(false)} width={760}>
          {() => (
            <>
              <div className="sch-chips">
                <div><span>Time in</span><b>{t12(sched.start)}</b></div>
                <div><span>Time out</span><b>{t12(sched.end)}</b></div>
                <div><span>Workdays</span><b>{sched.days.map((d) => WEEKDAYS[d]).join(' · ')}</b></div>
                <div><span>Grace period</span><b>{sched.grace} min</b></div>
                <div><span>Unpaid break</span><b>{sched.brk} min</b></div>
              </div>
              <p className="small muted" style={{ margin: '10px 0 14px' }}>Times are recorded by the server in Asia/Manila time.</p>
              <Calendar sched={sched} off={off} today={today} />
            </>
          )}
        </Modal>
      )}
    </>
  );
}
