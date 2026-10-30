'use client';
// Dashboard announcements: a pinned one (owner / admin only) and a regular one anyone can post. When both exist the pinned
// one leads and the regular one sits below it, each with who posted it. Staff only get a "Post" button (a new post, never an
// edit of the pinned one); owners / admins can edit either and pin or unpin. The editor and the history open as modals.
// Posts to POST /api/announcement; every save is kept in the history (see lib/queries/announcement.ts).
import { useRef, useState } from 'react';
import { ApiForm, Submit } from './form';
import { ShellPortal } from './shell-portal';
import type { Announcement, AnnouncementLog } from '@/lib/queries/announcement';

const stamp = (s: string) => {
  const d = new Date(s.replace(' ', 'T') + '+08:00');
  return isNaN(+d) ? s.slice(0, 16) : d.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Manila' });
};

type Slot = 'pinned' | 'regular';

export function AnnouncementCard({ pinned, regular, history, owner }: { pinned: Announcement; regular: Announcement; history: AnnouncementLog[]; owner: boolean }) {
  const edit = useRef<HTMLDialogElement>(null);
  const hist = useRef<HTMLDialogElement>(null);
  const [k, setK] = useState(0); // remount the form so the textarea shows the right text each time it opens
  const [slot, setSlot] = useState<Slot>('regular');
  const [fresh, setFresh] = useState(false); // staff "Post": always a blank new post
  const hasPin = !!pinned.text;
  const open = (s: Slot, blank: boolean) => { setSlot(s); setFresh(blank); setK((n) => n + 1); edit.current?.showModal(); };
  const backdrop = (r: React.RefObject<HTMLDialogElement | null>) => (e: React.MouseEvent) => { if (e.target === r.current) r.current?.close(); };
  const cur = slot === 'pinned' ? pinned : regular;
  const text = fresh ? '' : cur.text;
  const editing = !!text;

  const card = (s: Slot, a: Announcement, withHistory: boolean) => {
    const has = !!a.text;
    const isPin = s === 'pinned';
    const canEdit = owner || !isPin;
    return (
      <section className={`annb${has ? '' : ' empty'}${isPin ? ' pinned' : ''}${hasPin && !isPin ? ' second' : ''}`} aria-label={isPin ? 'Pinned announcement' : 'Announcement'}>
        <div className="annb-icon" aria-hidden="true">
          {isPin
            ? <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 17v5" /><path d="M9 3h6l-1 6 3 3v2H7v-2l3-3-1-6Z" /></svg>
            : <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" /></svg>}
        </div>
        <div className="annb-body">
          <div className="annb-top">
            <span className="annb-label">{isPin ? 'Pinned announcement' : 'Announcement'}</span>
            <span className="annb-tools">
              {withHistory && history.length > 0 && <button type="button" className="annb-btn" onClick={() => hist.current?.showModal()} aria-haspopup="dialog">History</button>}
              {canEdit && (owner
                ? <button type="button" className="annb-btn" onClick={() => open(s, false)} aria-haspopup="dialog">{has ? 'Edit' : 'Post announcement'}</button>
                : <button type="button" className="annb-btn" onClick={() => open('regular', true)} aria-haspopup="dialog">Post</button>)}
            </span>
          </div>
          {has ? (
            <>
              <p className="annb-text">{a.text}</p>
              {(a.by || a.at) && <div className="annb-meta">{a.by && <>Posted by <strong>{a.by}</strong></>}{a.by && a.at && ' · '}{a.at && stamp(a.at)}</div>}
            </>
          ) : <p className="annb-none">{hasPin ? 'No other announcements right now.' : 'No announcements right now. Post one to keep the team informed.'}</p>}
        </div>
      </section>
    );
  };

  return (
    <div className="annstack">
      {hasPin && card('pinned', pinned, true)}
      {card('regular', regular, !hasPin)}

      <ShellPortal>
        <dialog ref={edit} className="modal wide" style={{ width: 'min(560px, calc(100vw - 32px))' }} aria-labelledby="ann-edit-title" onClick={backdrop(edit)}>
          <div className="modal-head">
            <h3 id="ann-edit-title">{editing ? 'Edit announcement' : 'Post announcement'}</h3>
            <button type="button" className="modal-x" aria-label="Close" onClick={() => edit.current?.close()}>×</button>
          </div>
          <div className="modal-body">
            <ApiForm key={k} action="/api/announcement" onDone={(d) => { if (d.ok) edit.current?.close(); }}>
              <input type="hidden" name="slot" value={slot} />
              <div className="field">
                <label htmlFor="ann-text">Message</label>
                <textarea id="ann-text" name="text" rows={6} maxLength={1000} defaultValue={text} placeholder="Write an announcement for the team…" autoFocus />
                <div className="small muted">Visible to everyone on the dashboard. {editing ? 'Leave empty and save to remove it. ' : ''}Previous versions stay in History.</div>
              </div>
              {owner && (
                <label className="annb-pin"><input type="checkbox" name="pin" value="1" defaultChecked={slot === 'pinned'} /> Pin this announcement <span className="small muted">(stays on top; any other announcement shows below it)</span></label>
              )}
              <div className="row"><Submit>{editing ? 'Save changes' : 'Post'}</Submit> <button type="button" className="btn ghost" onClick={() => edit.current?.close()}>Cancel</button></div>
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
              {history.map((h) => {
                const current = h.body && (h.pinned ? h.id === history.find((x) => x.pinned)?.id : h.id === history.find((x) => !x.pinned)?.id);
                return (
                  <li key={h.id} className={h.body ? '' : 'gone'}>
                    <div className="annh-meta">
                      <strong>{h.by || 'Unknown'}</strong><span>{h.at && stamp(h.at)}</span>
                      {h.pinned && <span className="annh-tag">Pinned</span>}
                      {current && <span className="annh-tag cur">Current</span>}
                      {!h.body && <span className="annh-tag">Removed</span>}
                    </div>
                    {h.body && <p>{h.body}</p>}
                  </li>
                );
              })}
            </ol>
          </div>
        </dialog>
      </ShellPortal>
    </div>
  );
}
