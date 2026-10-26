'use client';
// Receipt column + slide-in viewer for Monitoring Finances. Each <ReceiptLink> announces which receipt to open; the single
// <ReceiptPanel> listens, slides in from the right edge and shows the image / PDF inline (with open-in-tab and download).
import { useEffect, useRef, useState } from 'react';
import { ShellPortal } from './shell-portal';

type Receipt = { id: number; kind: 'pdf' | 'img'; label: string };
const EVT = 'receipt:open';

export function ReceiptLink({ id, kind, label }: Receipt) {
  return (
    <button type="button" className="rc-link" onClick={() => window.dispatchEvent(new CustomEvent<Receipt>(EVT, { detail: { id, kind, label } }))}>
      <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4" /></svg>
      View
    </button>
  );
}

export function ReceiptPanel() {
  const [cur, setCur] = useState<Receipt | null>(null);
  const [open, setOpen] = useState(false);
  const panel = useRef<HTMLElement>(null);
  useEffect(() => {
    const on = (e: Event) => { setCur((e as CustomEvent<Receipt>).detail); setOpen(true); };
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener(EVT, on);
    window.addEventListener('keydown', key);
    return () => { window.removeEventListener(EVT, on); window.removeEventListener('keydown', key); };
  }, []);
  // Click anywhere outside the panel closes it (another receipt's View button is left alone so it can swap the file).
  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => {
      const t = e.target as Element;
      if (!panel.current?.contains(t) && !t.closest('.rc-link')) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [open]);
  const src = cur ? `/api/files/receipt/${cur.id}?inline=1` : '';
  return (
    <ShellPortal>
      <aside ref={panel} className={`rc-panel${open ? ' open' : ''}`} aria-hidden={!open} aria-label="Receipt">
        <div className="rc-head">
          <strong>Receipt</strong>
          <span className="rc-actions">
            {cur && <a href={src} target="_blank" rel="noopener noreferrer">Open in new tab</a>}
            {cur && <a href={`/api/files/receipt/${cur.id}`}>Download</a>}
            <button type="button" className="modal-x" aria-label="Close receipt" onClick={() => setOpen(false)}>×</button>
          </span>
        </div>
        <div className="rc-body">
          {open && cur && (cur.kind === 'pdf'
            ? <iframe src={src} title={cur.label} />
            // eslint-disable-next-line @next/next/no-img-element
            : <img src={src} alt={cur.label} />)}
        </div>
      </aside>
    </ShellPortal>
  );
}
