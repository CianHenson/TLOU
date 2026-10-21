import { useEffect, useState } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { useFlash } from '../lib/flash';
import { useSite } from '../lib/site';
import { useTitle } from '../lib/title';

type NavItem = [label: string, to: string] | ['__', group: string];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { data } = useSite();
  const { flash, clear } = useFlash();
  const title = useTitle();
  const loc = useLocation();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [loc.pathname]);
  if (!user) return null;
  // Forced password change: nothing else is reachable until it is done.
  if (user.must_change_pw && !loc.pathname.startsWith('/app/profile')) return <Navigate to="/app/profile" replace />;

  const owner = user.role === 'owner';
  const items: NavItem[] = owner ? [
    ['Dashboard', '/app'], ['Customer Management', '/app/customers'], ['Travel Requests', '/app/requests'], ['Booking Management', '/app/bookings'],
    ['__', 'Finance'], ['Financial Management', '/app/finance'], ['Payment Records', '/app/payments'], ['Expense Management', '/app/expenses'],
    ['__', 'People'], ['Employee Management', '/app/employees'], ['My Attendance', '/app/attendance'], ['Attendance Monitoring', '/app/attendance-monitor'], ['Monthly Attendance Reports', '/app/attendance-report'],
    ['__', 'Website & System'], ['Service Management', '/app/services'], ['Website Content', '/app/content'], ['Audit Logs', '/app/audit'], ['System Settings', '/app/settings'], ['My Profile', '/app/profile'],
  ] : [
    ['Dashboard', '/app'], ['My Attendance', '/app/attendance'], ['Customer Management', '/app/customers'], ['Travel Requests', '/app/requests'], ['Bookings', '/app/bookings'],
    ['Transactions & Payments', '/app/payments'], ...(user.can_expenses ? [['Expenses', '/app/expenses'] as NavItem] : []), ['My Profile', '/app/profile'],
  ];

  return (
    <div className="shell">
      <aside className={`side ${open ? 'open' : ''}`} aria-label="Navigation">
        <Link className="logo" to="/app"><i>✈</i><span>{data?.settings.business_name ?? 'Travel system'}</span></Link>
        {items.map((n) => n[0] === '__'
          ? <div key={n[1]} className="grp">{n[1]}</div>
          : <NavLink key={n[1]} to={n[1]} end={n[1] === '/app'} className={({ isActive }) => `n ${isActive ? 'on' : ''}`}>{n[0]}</NavLink>)}
        <div className="grp">Account</div>
        <div className="small" style={{ padding: '0 10px 8px' }}>{user.name} · {owner ? 'Owner' : 'Employee'}</div>
        <div style={{ padding: '0 10px' }}>
          <button className="btn ghost sm" onClick={() => { logout(); nav('/'); }}>Log out</button>
        </div>
        <p className="small" style={{ padding: '8px 10px' }}><Link to="/" style={{ color: '#9fc3d9' }}>View public website ↗</Link></p>
      </aside>
      <div className="main">
        <div className="topbar">
          <div className="row">
            <button className="btn ghost sm menu" onClick={() => setOpen((o) => !o)} aria-label="Menu">☰ Menu</button>
            <h1>{title}</h1>
          </div>
        </div>
        {flash && (
          <div className={`flash ${flash.type}`} role="status" onClick={clear} style={{ cursor: 'pointer' }}>{flash.msg}</div>
        )}
        <Outlet />
      </div>
    </div>
  );
}
