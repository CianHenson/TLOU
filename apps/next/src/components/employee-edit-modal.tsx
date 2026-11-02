'use client';
import { useEffect, useRef, useState } from 'react';
import { ShellPortal } from './shell-portal';
import { EmployeeForm, NEW_USER } from './employee-form';
import type { Row } from '@/lib/types';

/** Edit-user dialog for User Management; posts to /api/employees/[id]. Mounted only while editing (keyed by id). */
export function EmployeeEditModal({ user, onClose }: { user: Row; onClose: () => void }) {
  const dlg = useRef<HTMLDialogElement | null>(null);
  // ShellPortal mounts its children a render late, so open the dialog when the element actually attaches.
  const attach = (el: HTMLDialogElement | null) => { dlg.current = el; if (el && !el.open) el.showModal(); };
  const close = () => dlg.current?.close();
  return (
    <ShellPortal>
      <dialog ref={attach} className="modal wide" style={{ width: 'min(800px, calc(100vw - 32px))' }} aria-labelledby="ue-title"
        onClose={onClose} onClick={(e) => { if (e.target === dlg.current) close(); }}>
        <div className="modal-head">
          <h3 id="ue-title">Edit user — {user.name}</h3>
          <button type="button" className="modal-x" aria-label="Close" onClick={close}>×</button>
        </div>
        <div className="modal-body">
          <EmployeeForm isNew={false} onClose={close} e={{ id: user.id, first_name: user.first_name ?? '', last_name: user.last_name ?? '', email: user.email ?? '',
            role: user.role, designation: user.designation ?? '', active: user.active, can_expenses: user.can_expenses, can_messages: user.can_messages }} />
        </div>
      </dialog>
    </ShellPortal>
  );
}

/** Window event that opens the Add user dialog (the table's empty-space context menu sends it). */
export const ADD_USER_EVT = 'user:add';

/**
 * Gold "+" header button on User Management (same as Monitoring Finances) that opens the Add user form in a dialog; the
 * form is remounted empty each time. Also opens on the ADD_USER_EVT window event.
 */
export function NewUserButton() {
  const dlg = useRef<HTMLDialogElement>(null);
  const [k, setK] = useState(0);
  const open = () => { setK((n) => n + 1); dlg.current?.showModal(); };
  const close = () => dlg.current?.close();
  useEffect(() => {
    window.addEventListener(ADD_USER_EVT, open);
    return () => window.removeEventListener(ADD_USER_EVT, open);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <>
      <button type="button" className="icon-btn" aria-label="Add user" title="Add user" aria-haspopup="dialog" onClick={open}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      <ShellPortal>
        <dialog ref={dlg} className="modal wide" style={{ width: 'min(800px, calc(100vw - 32px))' }} aria-labelledby="un-title" onClick={(e) => { if (e.target === dlg.current) close(); }}>
          <div className="modal-head">
            <h3 id="un-title">Add user</h3>
            <button type="button" className="modal-x" aria-label="Close" onClick={close}>×</button>
          </div>
          <div className="modal-body"><EmployeeForm key={k} isNew onClose={close} e={NEW_USER} /></div>
        </dialog>
      </ShellPortal>
    </>
  );
}
