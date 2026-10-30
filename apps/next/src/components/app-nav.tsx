'use client';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { createPortal } from 'react-dom';
import { ApiForm, Submit } from './form';
import { PROFILE_EVT } from './profile-modal';

export type NavItem = { label: string; href: string } | { group: string };

const Ico = ({ children }: { children: ReactNode }) => (
  <svg className="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{children}</svg>
);

/** Sidebar icon per module (unknown hrefs get a dot). */
const ICONS: Record<string, ReactNode> = {
  '/app': <path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z" />,
  '/app/finance': <><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></>,
  '/app/airfare': <path d="M17.8 19.2L16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />,
  '/app/finance-monitor': <path d="M3 3h18v18H3zM3 9h18M3 15h18M9 3v18" />,
  '/app/expenses':<path d="M6 2h12v20l-3-2-3 2-3-2-3 2zM9 7h6M9 11h6M9 15h4" />,
  '/app/attendance-monitor': <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  '/app/attendance': <path d="M3 5h18v16H3zM3 9h18M8 3v4M16 3v4M9 15l2 2 4-4" />,
  '/app/employees': <><circle cx="9" cy="7" r="4" /><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
  '/app/audit': <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>,
  '/app/profile': <><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1" /></>,
  '/app/customers': <><path d="M3 4h18v16H3z" /><circle cx="9" cy="10" r="2" /><path d="M15 9h3M15 13h3M6 16a3 3 0 0 1 6 0" /></>,
  '/app/requests': <path d="M22 12h-6l-2 3h-4l-2-3H2M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />,
  '/app/bookings': <path d="M3 7h18v4a2 2 0 0 0 0 4v4H3v-4a2 2 0 0 0 0-4zM13 7v12" />,
  '/app/payments': <path d="M2 5h20v14H2zM2 10h20" />,
};
const DOT = <circle cx="12" cy="12" r="3" />;

export function AppNav({ items, userName, roleLabel }: { items: NavItem[]; userName: string; roleLabel: string }) {
  const path = usePathname();
  return (
    <>
      {items.map((n, i) => 'group' in n
        ? <div className="grp" key={i}>{n.group}</div>
        : <Link key={n.href} title={n.label} className={`n ${(n.href === '/app' ? path === '/app' : path === n.href || path.startsWith(n.href + '/')) ? 'on' : ''}`} href={n.href}>
            <Ico>{ICONS[n.href] ?? DOT}</Ico><span className="lbl">{n.label}</span>
          </Link>)}
      <UserMenu userName={userName} roleLabel={roleLabel} />
    </>
  );
}

const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]!.toUpperCase()).join('') || '?';

/** Avatar + name at the bottom of the sidebar; opens a small menu with Edit profile and Log out. */
function UserMenu({ userName, roleLabel }: { userName: string; roleLabel: string }) {
  const [pos, setPos] = useState<{ left: number; bottom: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => setPos(null), [path]);
  useEffect(() => {
    if (!pos) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setPos(null);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [pos]);
  // Fixed position, rendered into .shell (outside the sidebar): the sidebar's backdrop-filter would otherwise
  // re-anchor position:fixed to itself and its scrolling would clip the menu.
  const toggle = () => {
    const r = btn.current!.getBoundingClientRect();
    setPos(pos ? null : { left: r.left, bottom: window.innerHeight - r.top + 8 });
  };
  return (
    <div className="side-acct">
      <button ref={btn} type="button" className="side-user" onClick={toggle} aria-haspopup="menu" aria-expanded={!!pos} title={`${userName} · ${roleLabel}`}>
        <span className="avatar" aria-hidden="true">{initials(userName)}</span>
        <span className="lbl"><b>{userName.trim().split(/\s+/)[0] || userName}</b><small>{roleLabel}</small></span>
      </button>
      {pos && createPortal(
        <div ref={menu} className="user-menu" role="menu" style={{ left: pos.left, bottom: pos.bottom }}>
          <div className="um-head"><span className="avatar" aria-hidden="true">{initials(userName)}</span><span><b>{userName}</b><small>{roleLabel}</small></span></div>
          <button type="button" className="um-item" role="menuitem" onClick={() => { setPos(null); window.dispatchEvent(new Event(PROFILE_EVT)); }}>
            <Ico><path d="M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z" /></Ico>Edit profile
          </button>
          <ApiForm action="/api/auth/logout" redirect="/login">
            <Submit className="um-item danger"><Ico><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" /></Ico>Log out</Submit>
          </ApiForm>
        </div>,
        btn.current!.closest('.shell') ?? document.body,
      )}
    </div>
  );
}

/** Saves a UI preference for a year; the app layout reads it on the server so the first paint is already right. */
const savePref = (k: string, v: string) => { document.cookie = `${k}=${v}; path=/; max-age=31536000; samesite=lax`; };

/**
 * Sidebar top row: the logo (passed as children), the light/dark toggle and the burger. Both work on the `.shell` element's data attributes
 * (`data-side="mini"`, `data-theme`), see app/app/shell.css. On phones the burger closes the slide-in menu instead.
 */
export function SideTools({ theme, collapsed, children }: { theme: 'light' | 'dark'; collapsed: boolean; children: ReactNode }) {
  const [t, setT] = useState(theme);
  const [mini, setMini] = useState(collapsed);
  const shell = () => document.querySelector<HTMLElement>('.shell');
  const toggleSide = () => {
    if (matchMedia('(max-width: 900px)').matches) { document.querySelector('.side')?.classList.remove('open'); return; }
    const next = !mini;
    setMini(next);
    if (next) shell()?.setAttribute('data-side', 'mini'); else shell()?.removeAttribute('data-side');
    savePref('tcaps_side', next ? 'mini' : 'full');
  };
  const toggleTheme = () => {
    const next = t === 'dark' ? 'light' : 'dark';
    setT(next);
    shell()?.setAttribute('data-theme', next);
    savePref('tcaps_theme', next);
  };
  return (
    <div className="side-head">
      {children}
      <button type="button" className="side-btn side-theme" onClick={toggleTheme} aria-label={t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'} title={t === 'dark' ? 'Light theme' : 'Dark theme'}>
        {t === 'dark'
          ? <Ico><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" /></Ico>
          : <Ico><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></Ico>}
      </button>
      <button type="button" className="side-btn" onClick={toggleSide} aria-label={mini ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!mini} title={mini ? 'Expand sidebar' : 'Collapse sidebar'}>
        <Ico><path d="M3 6h18M3 12h18M3 18h18" /></Ico>
      </button>
    </div>
  );
}
