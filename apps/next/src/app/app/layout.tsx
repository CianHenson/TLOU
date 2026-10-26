import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { cookies } from 'next/headers';
import { AppNav, SideTools, type NavItem } from '@/components/app-nav';
import { currentUser, isOwner } from '@/lib/auth';
import { settings } from '@/lib/biz';
import { redirect } from 'next/navigation';
import './shell.css';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await currentUser();
  if (!me) redirect('/login');
  const S = await settings();
  const owner = isOwner(me);
  const nav: NavItem[] = owner ? [
    { label: 'Dashboard', href: '/app' },
    { group: 'Sales & Expenses' }, { label: 'Airfare Sales', href: '/app/airfare' }, { label: 'Sales', href: '/app/finance' }, { label: 'Monitoring Finances', href: '/app/finance-monitor' },
    { group: 'People' }, { label: 'Attendance Monitoring', href: '/app/attendance-monitor' }, { label: 'User Management', href: '/app/employees' },
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
        <AppNav items={nav} userName={me.name} roleLabel={owner ? 'Owner' : 'Employee'} />
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}
