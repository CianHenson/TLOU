'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ApiForm, Submit } from './form';

export type NavItem = { label: string; href: string } | { group: string };

export function AppNav({ items, userName, roleLabel }: { items: NavItem[]; userName: string; roleLabel: string }) {
  const path = usePathname();
  return (
    <>
      {items.map((n, i) => 'group' in n
        ? <div className="grp" key={i}>{n.group}</div>
        : <Link key={n.href} className={`n ${(n.href === '/app' ? path === '/app' : path.startsWith(n.href)) ? 'on' : ''}`} href={n.href}>{n.label}</Link>)}
      <div className="grp">Account</div>
      <div className="small" style={{ padding: '0 10px 8px' }}>{userName} · {roleLabel}</div>
      <ApiForm action="/api/auth/logout" redirect="/" style={{ padding: '0 10px' }}><Submit className="btn ghost sm">Log out</Submit></ApiForm>
      <p className="small" style={{ padding: '8px 10px' }}><Link href="/" style={{ color: '#9fc3d9' }}>View public website ↗</Link></p>
    </>
  );
}
