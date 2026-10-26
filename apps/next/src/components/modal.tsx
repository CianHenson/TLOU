'use client';
// Shared dialog shell + POST helper for the Attendance Monitoring modals (same look as the expense / user dialogs).
import { useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { ShellPortal } from './shell-portal';
import { useFlash } from './flash';

/**
 * Modal dialog that is open while mounted: render it conditionally and unmount it in `onClose`. `children` gets a
 * `close()` that runs the closing animation path (Esc, ×, backdrop click and Cancel all end in `onClose`).
 */
export function Modal({ title, onClose, width = 620, children }: { title: ReactNode; onClose: () => void; width?: number; children: (close: () => void) => ReactNode }) {
  const dlg = useRef<HTMLDialogElement | null>(null);
  // ShellPortal mounts its children a render late, so open the dialog when the element actually attaches.
  const attach = (el: HTMLDialogElement | null) => { dlg.current = el; if (el && !el.open) el.showModal(); };
  const close = () => dlg.current?.close();
  return (
    <ShellPortal>
      <dialog ref={attach} className="modal wide" style={{ width: `min(${width}px, calc(100vw - 32px))` }} aria-label={typeof title === 'string' ? title : undefined}
        onClose={onClose} onClick={(e) => { if (e.target === dlg.current) close(); }}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="modal-x" aria-label="Close" onClick={close}>×</button>
        </div>
        <div className="modal-body">{children(close)}</div>
      </dialog>
    </ShellPortal>
  );
}

/** POST form fields to an API route, flash the message and refresh the page on success. `busy` is true while sending. */
export function usePost() {
  const router = useRouter();
  const { show } = useFlash();
  const [busy, setBusy] = useState(false);
  const post = async (url: string, fields: Record<string, string> = {}) => {
    const fd = new FormData();
    for (const [k, v] of Object.entries(fields)) fd.set(k, v);
    setBusy(true);
    try {
      const res = await fetch(url, { method: 'POST', body: fd, credentials: 'same-origin' });
      const d = await res.json();
      show(d.ok ? 'ok' : 'err', d.msg || (d.ok ? 'Saved.' : 'Something went wrong.'));
      if (d.ok) router.refresh();
      return d as { ok: boolean; msg?: string };
    } catch {
      show('err', 'Network error. Please try again.');
      return { ok: false };
    } finally { setBusy(false); }
  };
  return { post, busy };
}

/** Gold "+" header button (same as Monitoring Finances / User Management). */
export function PlusButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" className="icon-btn" aria-label={label} title={label} aria-haspopup="dialog" onClick={onClick}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
    </button>
  );
}
