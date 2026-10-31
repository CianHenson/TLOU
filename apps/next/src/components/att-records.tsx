'use client';
// Attendance Monitoring → Attendance: daily records (one per employee per day) with computed hours and status. Row
// selection like the other tables (the footer adds up the selected hours); right-click → Correct record posts to the
// existing /api/attendance/correct, which logs the original times with the required reason.
import { useState } from 'react';
import { hm12, hrs, longDate } from '@/lib/util';
import { ATT_BADGE, type Row } from '@/lib/types';
import { ApiForm, Field, Submit } from './form';
import { TimeField } from './date-time-picker';
import { useRowSelection } from './row-select';
import { Modal } from './modal';
import { FootLine } from './ui';

const t24 = (s?: string | null) => (s ? s.slice(11, 16) : '');
const hm = (s?: string | null) => hm12(s);

function Correct({ r, onClose }: { r: Row; onClose: () => void }) {
  return (
    <Modal title={`Correct attendance — ${r.name}`} onClose={onClose}>
      {(close) => (
        <ApiForm action="/api/attendance/correct" stay onDone={(d) => { if (d.ok) close(); }}>
          <input type="hidden" name="user_id" value={r.uid} /><input type="hidden" name="day" value={r.day} />
          <p className="small muted" style={{ marginTop: 0 }}>{longDate(r.day)} · currently <strong>{r.status}</strong>. The original times are kept in the correction log with your reason; hours and lateness are recalculated.</p>
          <div className="grid g2">
            <TimeField name="time_in" label="Time in *" defaultValue={t24(r.time_in)} />
            <TimeField name="time_out" label="Time out" defaultValue={t24(r.time_out)} />
            <TimeField name="break_out" label="Break out" defaultValue={t24(r.break_out)} />
            <TimeField name="break_in" label="Break in" defaultValue={t24(r.break_in)} />
          </div>
          <Field name="reason" label="Reason for the correction *" attrs={{ required: true, maxLength: 500, placeholder: 'e.g. Forgot to time out; confirmed with supervisor' }} />
          <div className="row"><Submit>Save correction</Submit> <button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
        </ApiForm>
      )}
    </Modal>
  );
}

export function AttendanceTable({ rows, totalMins, totalCount }: { rows: Row[]; totalMins: number; totalCount: number }) {
  const { wrap, sel, menu, setMenu, rowProps, selBox } = useRowSelection(rows.map((_, i) => i), 70);
  const [fixing, setFixing] = useState<Row | null>(null);
  const picked = rows.filter((_, i) => sel.has(i));
  const one = menu && menu.ids.length === 1 ? rows[menu.ids[0]] : undefined;
  return (
    <div className="tw tw-fixed tw-fm tw-sel" ref={wrap}>
      <table><thead><tr><th>Employee</th><th>Date</th><th>Time in</th><th>Break out</th><th>Break in</th><th>Time out</th><th className="num">Hours worked</th><th>Status</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={`${r.uid}-${r.day}`} {...rowProps(i)} onDoubleClick={() => setFixing(r)}>
              <td>{r.name}<div className="small muted">{r.designation || ''}</div></td>
              <td className="nowrap">{longDate(r.day)}</td>
              <td>{hm(r.time_in) || <span className="muted">—</span>}</td>
              <td>{hm(r.break_out) || <span className="muted">—</span>}</td>
              <td>{hm(r.break_in) || (r.break_out ? <span className="badge b-warn">Not yet</span> : <span className="muted">—</span>)}</td>
              <td>{hm(r.time_out) || (r.time_in ? <span className="badge b-warn">Not yet</span> : <span className="muted">—</span>)}</td>
              <td className="num">{r.mins ? hrs(r.mins) : <span className="muted">—</span>}</td>
              <td><span className={`badge ${ATT_BADGE[r.status] || ''}`}>{r.status}</span>{r.late_min ? <span className="small muted"> +{r.late_min} min</span> : null}
                {r.issue && <div className="small att-issue">{r.issue}</div>}</td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={8} className="empty"><strong>No attendance records match these filters.</strong><br /><span className="small muted">Try another date range, employee or status.</span></td></tr>}
          {!!rows.length && <tr className="fill"><td colSpan={8} /></tr>}
        </tbody>
        {/* Total hours count complete time-in/out only; while rows are selected it is the selection's. */}
        {!!rows.length && <FootLine cols={8} total={totalCount} selected={picked.length}
          right={`Total hours: ${hrs(picked.length ? picked.reduce((a, r) => a + r.mins, 0) : totalMins)}`} />}
      </table>
      {menu && one && (
        <div className="ctx-menu" role="menu" style={{ left: menu.x, top: menu.y }} onContextMenu={(e) => e.preventDefault()}>
          <button type="button" role="menuitem" onClick={() => { setMenu(null); setFixing(one); }}>Correct record</button>
        </div>
      )}
      {fixing && <Correct key={`${fixing.uid}-${fixing.day}`} r={fixing} onClose={() => setFixing(null)} />}
      {selBox}
    </div>
  );
}
