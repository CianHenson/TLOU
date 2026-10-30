import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { AppNav, SideTools, type NavItem } from '@/components/app-nav';
import { ProfileModal } from '@/components/profile-modal';
import { db } from '@/lib/db';
import { ConfirmHost } from '@/components/confirm';
import { currentUser, isOwner } from '@/lib/auth';
import { settings } from '@/lib/biz';
import { ROLE_LABELS } from '@/lib/types';
import { redirect } from 'next/navigation';
import './shell.css';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await currentUser();
  if (!me) redirect('/login');
  const S = await settings();
  const p = (await db.get('SELECT first_name,last_name,email,emp_no,name FROM users WHERE id=?', [me.id]))!;
  const [fn, ...rest] = String(p.name || '').split(' ');
  const profile = { first_name: p.first_name ?? fn ?? '', last_name: p.last_name ?? rest.join(' '), email: p.email ?? '', emp_no: p.emp_no ?? '' };
  const owner = isOwner(me);
  const nav: NavItem[] = owner ? [
    { label: 'Dashboard', href: '/app' },
    { group: 'Sales & Expenses' }, { label: 'Airfare Sales', href: '/app/airfare' }, { label: 'Sales', href: '/app/finance' }, { label: 'Monitoring Finances', href: '/app/finance-monitor' },
    { group: 'People' }, { label: 'Attendance & Payroll', href: '/app/attendance-monitor' }, { label: 'User Management', href: '/app/employees' },
    { group: 'System' }, { label: 'Audit Logs', href: '/app/audit' },
  ] : [
    { label: 'Dashboard', href: '/app' }, { label: 'Airfare Sales', href: '/app/airfare' }, { label: 'My Attendance', href: '/app/attendance' }, { label: 'Customer Management', href: '/app/customers' }, { label: 'Travel Requests', href: '/app/requests' }, { label: 'Bookings', href: '/app/bookings' },
    { label: 'Transactions & Payments', href: '/app/payments' }, ...(me.can_expenses ? [{ label: 'Expenses', href: '/app/expenses' }] : []),
  ];
  const jar = await cookies();
  const theme = jar.get('tcaps_theme')?.value === 'dark' ? 'dark' : 'light';
  const collapsed = jar.get('tcaps_side')?.value === 'mini';
  return (
    <div className="shell" data-theme={theme} data-side={collapsed ? 'mini' : undefined}>
      <aside className="side" aria-label="Navigation">
        <SideTools theme={theme} collapsed={collapsed}>
          <Link className="logo" href="/app" title={S.business_name}><span className="mark"><img src="/logo.png" alt="" /></span><span className="logo-name">{S.business_name}</span></Link>
        </SideTools>
        <AppNav items={nav} userName={me.name} roleLabel={ROLE_LABELS[me.role] ?? me.role} />
      </aside>
      <div className="main">{children}</div>
      <ProfileModal key={`${p.email}|${p.name}|${p.email}`} me={profile} />
      <ConfirmHost />
    </div>
  );
}
