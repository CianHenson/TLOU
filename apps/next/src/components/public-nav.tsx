'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useScrollSpy } from './widgets';

const LINKS: [string, string][] = [['home', 'Home'], ['about', 'About Us'], ['services', 'Services'], ['contact', 'Contact Us']];
const IDS = LINKS.map(([id]) => id);

/**
 * Public header links. On wide screens they sit in the header; on narrow screens (see .nav-burger in theme.css) the burger opens
 * them as a glass panel in the centre of the screen, over a blurred and dimmed page. Picking a link, the × button, clicking
 * outside the panel or Esc closes it. The panel is rendered in a portal because the header's own blur would otherwise make
 * `position: fixed` relative to the header instead of the screen.
 */
export function PublicNav() {
  const spy = useScrollSpy(IDS);
  const path = usePathname();
  const onHome = path === '/';
  const [open, setOpen] = useState(false);
  const warn = useRef<HTMLDialogElement>(null);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open]);
  const staffLogin = (e: React.MouseEvent) => { e.preventDefault(); setOpen(false); warn.current?.showModal(); };
  return (
    <div className="nav-box">
      <button type="button" className="nav-burger" aria-label="Open menu" aria-expanded={open} aria-controls="pub-nav-panel" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" /></svg>
      </button>
      <nav id="pub-nav" className="nav" aria-label="Main">
        {LINKS.map(([id, label]) => <Link key={id} href={`/#${id}`} className={onHome && spy === id ? 'on' : ''}>{label}</Link>)}
        <Link href="/login" className="muted small" onClick={staffLogin}>Staff login</Link>
      </nav>
      {open && createPortal(
        <div className="nav-overlay">
          <div className="nav-scrim" onMouseDown={() => setOpen(false)} />
          <nav id="pub-nav-panel" className="nav-glass" aria-label="Main menu">
            <button type="button" className="nav-glass-x" aria-label="Close menu" autoFocus onClick={() => setOpen(false)}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
            {LINKS.map(([id, label]) => <Link key={id} href={`/#${id}`} className={onHome && spy === id ? 'on' : ''} onClick={() => setOpen(false)}>{label}</Link>)}
            <Link href="/login" className="small" onClick={staffLogin}>Staff login</Link>
          </nav>
        </div>,
        document.body,
      )}
      <StaffLoginWarning dlg={warn} />
    </div>
  );
}

/** Shown before the login page: the area is for authorized personnel only; continue or go back. Kept outside the nav so it still shows while the mobile menu is closed. */
function StaffLoginWarning({ dlg }: { dlg: React.RefObject<HTMLDialogElement | null> }) {
  const router = useRouter();
  const close = () => dlg.current?.close();
  return (
    <dialog ref={dlg} className="pub-modal" aria-labelledby="staff-warn-title" onClick={(e) => { if (e.target === dlg.current) close(); }}>
      <div className="pub-modal-head">
        <h3 id="staff-warn-title">Authorized personnel only</h3>
        <button type="button" className="pub-modal-x" aria-label="Close" onClick={close}>×</button>
      </div>
      <div className="pub-modal-body">
        <p>This area is restricted to authorized staff of the business. If you are not a staff member, please go back.</p>
        <div className="pub-modal-actions">
          <button type="button" className="btn ghost" onClick={close}>No, go back</button>
          <button type="button" className="btn" autoFocus onClick={() => { close(); router.push('/login'); }}>Yes, continue</button>
        </div>
      </div>
    </dialog>
  );
}
