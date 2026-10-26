'use client';
// Dashboard announcement banner: shown to everyone, editable by any signed-in user. The editor and the history open as modals.
// Posts to POST /api/announcement; every save is kept in the history (see lib/queries/announcement.ts).
import { useRef, useState } from 'react';
import { ApiForm, Submit } from './form';
import { ShellPortal } from './shell-portal';
import type { Announcement, AnnouncementLog } from '@/lib/queries/announcement';

const stamp = (s: string) => {
  const d = new Date(s.replace(' ', 'T') + '+08:00');
  return isNaN(+d) ? s.slice(0, 16) : d.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' });
};

export function AnnouncementCard({ a, history }: { a: Announcement; history: AnnouncementLog[] }) {
  const edit = useRef<HTMLDialogElement>(null);
  const hist = useRef<HTMLDialogElement>(null);
  const [k, setK] = useState(0); // remount the form so the textarea shows the latest saved text each time it opens
  const has = !!a.text;
  const openEdit = () => { setK((n) => n + 1); edit.current?.showModal(); };
  const backdrop = (r: React.RefObject<HTMLDialogElement | null>) => (e: React.MouseEvent) => { if (e.target === r.current) r.current?.close(); };
  return (
    <section className={`annb${has ? '' : ' empty'}`} aria-label="Announcement">
      <div className="annb-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" /></svg>
      </div>
      <div className="annb-body">
        <div className="annb-top">
          <span className="annb-label">Announcement</span>
          <span className="annb-tools">
            {history.length > 0 && <button type="button" className="annb-btn" onClick={() => hist.current?.showModal()} aria-haspopup="dialog">History</button>}
            <button type="button" className="annb-btn" onClick={openEdit} aria-haspopup="dialog">{has ? 'Edit' : 'Post announcement'}</button>
          </span>
        </div>
        {has ? (
          <>
            <p className="annb-text">{a.text}</p>
            {(a.by || a.at) && <div className="annb-meta">{a.by && <>Posted by <strong>{a.by}</strong></>}{a.by && a.at && ' · '}{a.at && stamp(a.at)}</div>}
          </>
        ) : <p className="annb-none">No announcements right now. Post one to keep the team informed.</p>}
      </div>

      <ShellPortal>
        <dialog ref={edit} className="modal wide" style={{ width: 'min(560px, calc(100vw - 32px))' }} aria-labelledby="ann-edit-title" onClick={backdrop(edit)}>
          <div className="modal-head">
            <h3 id="ann-edit-title">{has ? 'Edit announcement' : 'Post announcement'}</h3>
            <button type="button" className="modal-x" aria-label="Close" onClick={() => edit.current?.close()}>×</button>
          </div>
          <div className="modal-body">
            <ApiForm key={k} action="/api/announcement" onDone={(d) => { if (d.ok) edit.current?.close(); }}>
              <div className="field">
                <label htmlFor="ann-text">Message</label>
                <textarea id="ann-text" name="text" rows={6} maxLength={1000} defaultValue={a.text} placeholder="Write an announcement for the team…" autoFocus />
                <div className="small muted">Visible to everyone on the dashboard. Leave empty and save to remove it. Previous versions stay in History.</div>
              </div>
              <div className="row"><Submit>{has ? 'Save changes' : 'Post'}</Submit> <button type="button" className="btn ghost" onClick={() => edit.current?.close()}>Cancel</button></div>
            </ApiForm>
          </div>
        </dialog>

        <dialog ref={hist} className="modal wide" style={{ width: 'min(640px, calc(100vw - 32px))' }} aria-labelledby="ann-hist-title" onClick={backdrop(hist)}>
          <div className="modal-head">
            <h3 id="ann-hist-title">Announcement history</h3>
            <button type="button" className="modal-x" aria-label="Close" onClick={() => hist.current?.close()}>×</button>
          </div>
          <div className="modal-body">
            {!history.length && <p className="muted">Nothing has been posted yet.</p>}
            <ol className="annh">
              {history.map((h, i) => (
                <li key={h.id} className={h.body ? '' : 'gone'}>
                  <div className="annh-meta">
                    <strong>{h.by || 'Unknown'}</strong><span>{h.at && stamp(h.at)}</span>
                    {i === 0 && h.body && <span className="annh-tag cur">Current</span>}
                    {!h.body && <span className="annh-tag">Removed</span>}
                  </div>
                  {h.body && <p>{h.body}</p>}
                </li>
              ))}
            </ol>
          </div>
        </dialog>
      </ShellPortal>
    </section>
  );
}
