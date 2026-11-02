'use client';
// My Attendance table: same fixed-size table, row selection and footer as the owner's Attendance Monitoring. Right-click a
// row → "Apply for correction" opens a form where the employee picks what to correct (time in, time out, status; one or
// more) and gives the reason; it goes to the owner / admin for approval. `hl` is the day opened from the dashboard calendar.
import { useEffect, useState } from 'react';
import { hm12, hrs, longDate } from '@/lib/util';
import { ATT_BADGE, ATT_STATUSES, CORR_FIELDS, LEAVE_BADGE } from '@/lib/types';
import { ApiForm, Field, Submit } from './form';
import { Dropdown } from './dropdown';
import { TimePicker } from './date-time-picker';
import { useRowSelection } from './row-select';
import { Modal } from './modal';
import { FootLine } from './ui';

export interface MyRow { day: string; wd: string; status: string; late_min: number; time_in: string; break_out: string; break_in: string; time_out: string; mins: number; corr: string; issue: string }

let uid = 0;
function Correction({ r, onClose }: { r: MyRow; onClose: () => void }) {
  const [lines, setLines] = useState(() => [{ id: ++uid, field: 'time_in' }]);
  const left = (id: number) => CORR_FIELDS.filter(([f]) => !lines.some((l) => l.id !== id && l.field === f));
  const free = CORR_FIELDS.filter(([f]) => !lines.some((l) => l.field === f));
  const start = (f: string) => ({ time_in: r.time_in, break_out: r.break_out, break_in: r.break_in, time_out: r.time_out } as Record<string, string>)[f] ?? '';
  return (
    <Modal title={`Apply for correction — ${longDate(r.day)}`} onClose={onClose} width={620}>
      {(close) => (
        <ApiForm action="/api/attendance/corrections" stay onDone={(d) => { if (d.ok) close(); }}>
          <input type="hidden" name="day" value={r.day} />
          <p className="small muted" style={{ marginTop: 0 }}>Choose what to correct. The owner or an admin will review your request.</p>
          {lines.map((l) => (
            <div className="corr-line" key={l.id}>
              <div className="field"><label>Correct *</label>
                <Dropdown name="field" ariaLabel="What to correct" value={l.field} options={left(l.id)} style={{ width: '100%' }}
                  onChange={(v) => setLines(lines.map((x) => (x.id === l.id ? { ...x, field: v } : x)))} /></div>
              <div className="field"><label>{l.field === 'status' ? 'Should be *' : 'Correct time *'}</label>
                {l.field === 'status'
                  ? <Dropdown name="value" ariaLabel="Correct status" defaultValue={ATT_STATUSES[0]} options={ATT_STATUSES} style={{ width: '100%' }} />
                  : <TimePicker key={l.field} name="value" ariaLabel="Correct time" defaultValue={start(l.field)} required hint={false} />}</div>
              {lines.length > 1 && <button type="button" className="btn ghost sm corr-x" aria-label="Remove this correction" onClick={() => setLines(lines.filter((x) => x.id !== l.id))}>×</button>}
            </div>
          ))}
          {free.length > 0 && <div style={{ marginBottom: 14 }}><button type="button" className="btn ghost sm" onClick={() => setLines([...lines, { id: ++uid, field: free[0][0] }])}>+ Add another correction</button></div>}
          <Field name="reason" label="Reason for the correction *" type="textarea" attrs={{ required: true, maxLength: 1000, rows: 3, placeholder: 'e.g. Forgot to time out; was on a client visit' }} />
          <div className="row"><Submit>Send request</Submit> <button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
        </ApiForm>
      )}
    </Modal>
  );
}

export function MyAttendanceTable({ rows, hl, totalMins }: { rows: MyRow[]; hl: string; totalMins: number }) {
  const { wrap, sel, setSel, menu, setMenu, rowProps, selBox } = useRowSelection(rows.map((_, i) => i), 60);
  // Opened from the dashboard calendar: the clicked day starts out selected (and pulses), so its details are right there.
  useEffect(() => { const i = rows.findIndex((r) => r.day === hl); if (hl && i >= 0) setSel(new Set([i])); }, [hl]); // eslint-disable-line react-hooks/exhaustive-deps
  const [fixing, setFixing] = useState<MyRow | null>(null);
  const picked = rows.filter((_, i) => sel.has(i));
  const one = menu && menu.ids.length === 1 ? rows[menu.ids[0]] : undefined;
  return (
    <div className="tw tw-fixed tw-fm tw-sel" ref={wrap}>
      <table><thead><tr><th>Date</th><th>Status</th><th>Time in</th><th>Break out</th><th>Break in</th><th>Time out</th><th className="num">Hours</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.day} {...rowProps(i, r.day === hl ? 'hb' : '')} id={r.day === hl ? 'hl-row' : undefined} onDoubleClick={() => setFixing(r)}>
              <td className="nowrap">{r.day} <span className="muted small">{r.wd}</span></td>
              <td><span className={`badge ${ATT_BADGE[r.status] || ''}`}>{r.status}</span>{r.late_min ? <span className="small muted"> +{r.late_min} min</span> : null}
                {r.issue && <div className="small att-issue">{r.issue}</div>}
                {r.corr && <div className="small"><span className={`badge ${LEAVE_BADGE[r.corr] || ''}`}>Correction {r.corr.toLowerCase()}</span></div>}</td>
              <td>{hm12(r.time_in) || <span className="muted">—</span>}</td><td>{hm12(r.break_out) || <span className="muted">—</span>}</td><td>{hm12(r.break_in) || <span className="muted">—</span>}</td><td>{hm12(r.time_out) || <span className="muted">—</span>}</td>
              <td className="num">{r.mins ? hrs(r.mins) : <span className="muted">—</span>}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={7} className="empty"><strong>No records for these dates.</strong><br /><span className="small muted">Try another date range.</span></td></tr>}
          {!!rows.length && <tr className="fill"><td colSpan={7} /></tr>}
        </tbody>
        {!!rows.length && <FootLine cols={7} total={rows.length} selected={picked.length}
          right={`Total hours: ${hrs(picked.length ? picked.reduce((a, r) => a + r.mins, 0) : totalMins)}`} />}
      </table>
      {menu && one && (
        <div className="ctx-menu" role="menu" style={{ left: menu.x, top: menu.y }} onContextMenu={(e) => e.preventDefault()}>
          <button type="button" role="menuitem" onClick={() => { setMenu(null); setFixing(one); }}>Apply for correction</button>
        </div>
      )}
      {fixing && <Correction key={fixing.day} r={fixing} onClose={() => setFixing(null)} />}
      {selBox}
    </div>
  );
}
