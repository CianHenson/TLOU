'use client';
import { ShellPortal } from './shell-portal';
import { useEffect, useRef, useState } from 'react';
import { AirfareForm } from './airfare-form';

/** Window event that opens the New sale dialog (the Airfare table's empty-space menu sends it). */
export const NEW_SALE_EVT = 'sale:new';

/**
 * Gold "+" header button that opens the New airfare sale form in a modal (<dialog>, top layer). On save the dialog
 * closes, the list refreshes and the form is remounted empty for the next sale.
 */
export function NewSaleButton({ today, airlines }: { today: string; airlines: string[] }) {
  const dlg = useRef<HTMLDialogElement>(null);
  const [k, setK] = useState(0);
  const close = () => dlg.current?.close();
  useEffect(() => {
    const open = () => dlg.current?.showModal();
    window.addEventListener(NEW_SALE_EVT, open);
    return () => window.removeEventListener(NEW_SALE_EVT, open);
  }, []);
  return (
    <>
      <button type="button" className="icon-btn" aria-label="New sale" title="New sale" aria-haspopup="dialog" onClick={() => dlg.current?.showModal()}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      <ShellPortal>
      <dialog ref={dlg} className="modal wide" aria-labelledby="ns-title" onClick={(e) => { if (e.target === dlg.current) close(); }}>
        <div className="modal-head">
          <h3 id="ns-title">New airfare sale</h3>
          <button type="button" className="modal-x" aria-label="Close" onClick={close}>×</button>
        </div>
        <div className="modal-body">
          <AirfareForm key={k} today={today} airlines={airlines} a={{ txn_date: today, pax: 1, checkin_status: 'Pending' }}
            onCancel={close} onDone={() => { close(); setK((n) => n + 1); }} />
        </div>
      </dialog>
      </ShellPortal>
    </>
  );
}
