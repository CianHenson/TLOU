import Link from 'next/link';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppNav, type NavItem } from '@/components/app-nav';
import { currentUser, isOwner } from '@/lib/auth';
import { settings } from '@/lib/biz';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function AppLayout({ children }: { children: ReactNode }) {
  const me = await currentUser();
  if (!me) redirect('/login');
  const S = await settings();
  const owner = isOwner(me);
  const nav: NavItem[] = owner ? [
    { label: 'Dashboard', href: '/app' }, { label: 'Customer Management', href: '/app/customers' }, { label: 'Travel Requests', href: '/app/requests' }, { label: 'Booking Management', href: '/app/bookings' },
    { group: 'Finance' }, { label: 'Financial Management', href: '/app/finance' }, { label: 'Payment Records', href: '/app/payments' }, { label: 'Expense Management', href: '/app/expenses' },
    { group: 'People' }, { label: 'Employee Management', href: '/app/employees' }, { label: 'My Attendance', href: '/app/attendance' }, { label: 'Attendance Monitoring', href: '/app/attendance-monitor' }, { label: 'Monthly Attendance Reports', href: '/app/attendance-report' },
    { group: 'Website & System' }, { label: 'Service Management', href: '/app/services' }, { label: 'Website Content', href: '/app/content' }, { label: 'Audit Logs', href: '/app/audit' }, { label: 'System Settings', href: '/app/settings' }, { label: 'My Profile', href: '/app/profile' },
  ] : [
    { label: 'Dashboard', href: '/app' }, { label: 'My Attendance', href: '/app/attendance' }, { label: 'Customer Management', href: '/app/customers' }, { label: 'Travel Requests', href: '/app/requests' }, { label: 'Bookings', href: '/app/bookings' },
    { label: 'Transactions & Payments', href: '/app/payments' }, ...(me.can_expenses ? [{ label: 'Expenses', href: '/app/expenses' }] : []), { label: 'My Profile', href: '/app/profile' },
  ];
  return (
    <div className="shell">
      <aside className="side" aria-label="Navigation">
        <Link className="logo" href="/app"><i>✈</i><span>{S.business_name}</span></Link>
        <AppNav items={nav} userName={me.name} roleLabel={owner ? 'Owner' : 'Employee'} />
      </aside>
      <div className="main">{children}</div>
    </div>
  );
}
