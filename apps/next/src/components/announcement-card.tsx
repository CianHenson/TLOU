'use client';
// Dashboard announcements: ONE list. A pinned announcement is the same card as before - it just moves to the top of the list,
// with a small gold "PINNED" badge and a gold left edge; unpinning puts it back among the regular posts. Every announcement
// appears once, and the count is the number of unique announcements. Everyone can post; the owner / admin can also edit,
// remove, pin and unpin (at most MAX_PINNED pinned at once - the server enforces it too). Pin / unpin update the list at once.
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ApiForm, Submit } from './form';
import { useFlash } from './flash';
import { ShellPortal } from './shell-portal';
import { MAX_PINNED, byPin, type Post } from '@/lib/announcement-shared';


const stamp = (s: string) => {
  const d = new Date(s.replace(' ', 'T') + '+08:00');
  return isNaN(+d) ? s.slice(0, 16) : d.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Manila' });
};

const MegaIcon = () => (
  <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1Z" /><path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8.5 8.5 0 0 1 0 12" /></svg>
);

export function AnnouncementCard({ posts, history, owner }: { posts: Post[]; history: Post[]; owner: boolean }) {
  const router = useRouter();
  const { show } = useFlash();
  const edit = useRef<HTMLDialogElement>(null);
  const all = useRef<HTMLDialogElement>(null);
  const [items, setItems] = useState(posts); // local copy so pin / unpin / remove show immediately
  const [busy, setBusy] = useState(false);
  const [k, setK] = useState(0); // remount the form so the fields show the right post each time it opens
  const [cur, setCur] = useState<Post | null>(null);
  useEffect(() => setItems(posts), [posts]);

  const list = [...items].sort(byPin);
  const pinned = list.filter((p) => p.pinned);
  const pinnedN = pinned.length;
  // The card shows the pinned announcements; with none pinned it shows the latest posted one (list is newest first).
  const shown = pinnedN ? pinned : list.slice(0, 1);
  // History = everything ever posted, newest first. Live posts follow the local (optimistic) state; a post gone from it was just removed.
  const hist = history.map((h) => (h.removed ? h : items.find((x) => x.id === h.id) ?? { ...h, pinned: false, removed: true }));
  const full = pinnedN >= MAX_PINNED;
  const open = (p: Post | null) => { setCur(p); setK((n) => n + 1); all.current?.close(); edit.current?.showModal(); };
  const backdrop = (r: React.RefObject<HTMLDialogElement | null>) => (e: React.MouseEvent) => { if (e.target === r.current) r.current?.close(); };
  const pinHint = `Only ${MAX_PINNED} announcements can be pinned. Unpin one first.`;

  const act = async (p: Post, action: 'pin' | 'unpin' | 'delete') => {
    if (busy) return;
    if (action === 'pin' && full) { show('err', pinHint); return; }
    if (action === 'delete' && !window.confirm('Remove this announcement?')) return;
    const before = items;
    setItems(action === 'delete' ? items.filter((x) => x.id !== p.id)
      : items.map((x) => (x.id === p.id ? { ...x, pinned: action === 'pin', pinnedAt: action === 'pin' ? new Date(Date.now() + 8 * 3600e3).toISOString().slice(0, 19).replace('T', ' ') : '' } : x)));
    setBusy(true);
    try {
      const fd = new FormData(); fd.set('id', String(p.id)); fd.set('action', action);
      const res = await fetch('/api/announcement', { method: 'POST', body: fd, credentials: 'same-origin' });
      const d = await res.json();
      if (!d.ok) setItems(before);
      show(d.ok ? 'ok' : 'err', d.msg || (d.ok ? 'Saved.' : 'Something went wrong.'));
      router.refresh();
    } catch { setItems(before); show('err', 'Network error. Please try again.'); } finally { setBusy(false); }
  };

  const tools = (p: Post) => owner && (
    <span className="annb-tools">
      {p.pinned
        ? <button type="button" className="annb-btn" disabled={busy} onClick={() => act(p, 'unpin')}>Unpin</button>
        : <button type="button" className="annb-btn" disabled={busy || full} title={full ? pinHint : undefined} onClick={() => act(p, 'pin')}>Pin</button>}
      <button type="button" className="annb-btn" onClick={() => open(p)} aria-haspopup="dialog">Edit</button>
    </span>
  );

  const item = (p: Post) => (
    <li key={p.id} className={`ann-item${p.pinned ? ' pinned' : ''}`}>
      <div className="annb-top">
        <span className="annb-label">{p.pinned && <span className="annb-pin-tag">PINNED</span>}{p.by ? <>Posted by <strong>{p.by}</strong></> : 'Announcement'} <span className="ann-when">· {stamp(p.at)}{p.edited && ' · edited'}</span></span>
        {tools(p)}
      </div>
      <p className="annb-text">{p.text}</p>
    </li>
  );

  const pinBlocked = full && !cur?.pinned;
  const bar = (
    <span className="annb-tools">
      <button type="button" className="annb-btn" onClick={() => all.current?.showModal()} aria-haspopup="dialog">History ({history.length})</button>
      <button type="button" className="annb-btn primary" onClick={() => open(null)} aria-haspopup="dialog">Post</button>
    </span>
  );
  return (
    <div className="annstack">
      {!shown.length && <div className="ann-bar" aria-label="Announcements"><span className="ann-count">Announcements <b>{list.length}</b></span>{bar}</div>}
      {!!shown.length && <section className="annb annone" aria-label="Announcements">
        <div className="annb-icon" aria-hidden="true"><MegaIcon /></div>
        <div className="annb-body">
          <div className="ann-head">
            <span className="ann-count">{pinnedN ? 'Pinned announcements' : 'Latest announcement'} <b>{pinnedN || list.length}</b></span>
            {bar}
          </div>
          <ul className="ann-list">{shown.map(item)}</ul>
        </div>
      </section>}

      <ShellPortal>
        <dialog ref={edit} className="modal wide" style={{ width: 'min(560px, calc(100vw - 32px))' }} aria-labelledby="ann-edit-title" onClick={backdrop(edit)}>
          <div className="modal-head">
            <h3 id="ann-edit-title">{cur ? 'Edit announcement' : 'Post announcement'}</h3>
            <button type="button" className="modal-x" aria-label="Close" onClick={() => edit.current?.close()}>×</button>
          </div>
          <div className="modal-body">
            <ApiForm key={k} action="/api/announcement" onDone={(d) => { if (d.ok) edit.current?.close(); }}>
              {cur && <input type="hidden" name="id" value={cur.id} />}
              <div className="field">
                <label htmlFor="ann-text">Message</label>
                <textarea id="ann-text" name="text" rows={6} maxLength={1000} required defaultValue={cur?.text ?? ''} placeholder="Write an announcement for the team…" autoFocus />
                <div className="small muted">Visible to everyone on the dashboard.</div>
              </div>
              {owner && (
                <label className="annb-pin"><input type="checkbox" name="pin" value="1" defaultChecked={!!cur?.pinned} disabled={pinBlocked} /> Pin this announcement{' '}
                  <span className="small muted">{pinBlocked ? `(${pinHint})` : `(moves to the top of the list; up to ${MAX_PINNED} can be pinned)`}</span></label>
              )}
              <div className="row"><Submit>{cur ? 'Save changes' : 'Post'}</Submit> <button type="button" className="btn ghost" onClick={() => edit.current?.close()}>Cancel</button></div>
            </ApiForm>
          </div>
        </dialog>

        <dialog ref={all} className="modal wide" style={{ width: 'min(680px, calc(100vw - 32px))' }} aria-labelledby="ann-all-title" onClick={backdrop(all)}>
          <div className="modal-head">
            <h3 id="ann-all-title">Announcement history ({hist.length})</h3>
            <button type="button" className="modal-x" aria-label="Close" onClick={() => all.current?.close()}>×</button>
          </div>
          <div className="modal-body">
            {owner && <p className="small muted" style={{ marginTop: 0 }}>Pinned: <strong>{pinnedN}/{MAX_PINNED}</strong>. Pinned announcements stay at the top.</p>}
            {!hist.length && <p className="muted">Nothing has been posted yet.</p>}
            <ol className="annh">
              {hist.map((p) => (
                <li key={p.id} className={`${p.pinned ? 'is-pinned' : ''}${p.removed ? ' gone' : ''}`}>
                  <div className="annh-meta">
                    <strong>{p.by || 'Unknown'}</strong><span>{stamp(p.at)}{p.edited && ' · edited'}</span>
                    {p.pinned && <span className="annb-pin-tag">PINNED</span>}
                    {p.removed && <span className="annh-tag">Removed</span>}
                  </div>
                  <p>{p.text}</p>
                  {owner && !p.removed && (
                    <div className="annh-tools">
                      {p.pinned ? <button type="button" className="annb-btn" disabled={busy} onClick={() => act(p, 'unpin')}>Unpin</button>
                        : <button type="button" className="annb-btn" disabled={busy || full} title={full ? pinHint : undefined} onClick={() => act(p, 'pin')}>Pin</button>}
                      <button type="button" className="annb-btn" onClick={() => open(p)}>Edit</button>
                      <button type="button" className="annb-btn danger" disabled={busy} onClick={() => act(p, 'delete')}>Remove</button>
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </div>
        </dialog>
      </ShellPortal>
    </div>
  );
}
