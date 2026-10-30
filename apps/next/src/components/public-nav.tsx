'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useScrollSpy } from './widgets';

const LINKS: [string, string][] = [['home', 'Home'], ['about', 'About Us'], ['services', 'Services'], ['contact', 'Contact Us']];
const IDS = LINKS.map(([id]) => id);

/**
 * Public header links. On narrow screens (see .nav-burger in theme.css) they fold into a drop-down opened by a burger
 * button; picking a link, clicking outside or Esc closes it.
 */
export function PublicNav() {
  const spy = useScrollSpy(IDS);
  const path = usePathname();
  const onHome = path === '/';
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const warn = useRef<HTMLDialogElement>(null);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);
  return (
    <div className="nav-box" ref={box}>
      <button type="button" className="nav-burger" aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="pub-nav" onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          {open ? <path d="M6 6l12 12M18 6L6 18" /> : <path d="M4 7h16M4 12h16M4 17h16" />}
        </svg>
      </button>
      <nav id="pub-nav" className={`nav ${open ? 'open' : ''}`} aria-label="Main">
        {LINKS.map(([id, label]) => <Link key={id} href={`/#${id}`} className={onHome && spy === id ? 'on' : ''} onClick={() => setOpen(false)}>{label}</Link>)}
        <Link href="/login" className="muted small" onClick={(e) => { e.preventDefault(); setOpen(false); warn.current?.showModal(); }}>Staff login</Link>
      </nav>
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
