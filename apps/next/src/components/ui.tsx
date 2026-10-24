// Server-rendered building blocks that reproduce the old EJS partials (th, pager, stat, badge, page header).
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FlashBar } from './flash';
import { MenuButton } from './widgets';
import type { Page } from '@/lib/list';

/** Default badge colour for a status word (pass `cls` to override, e.g. the booking/request palettes in the old views). */
export function badgeClass(s: string): string {
  if (['Completed', 'Booked / Confirmed', 'Confirmed', 'Paid', 'Valid', 'Present', 'Payment', 'Clocked in', 'On time'].includes(s)) return 'b-ok';
  if (['Cancelled', 'Rejected', 'Voided', 'Reversed', 'Absent', 'Refund', 'Incomplete'].includes(s)) return 'b-err';
  if (['Pending Review', 'Quoted', 'Partially Paid', 'Overpaid', 'Late', 'Pending', 'Awaiting Payment', 'Awaiting Customer Confirmation'].includes(s)) return 'b-warn';
  if (['Contacted', 'Quotation Sent', 'Processing Booking', 'Holiday', 'Approved leave'].includes(s)) return 'b-info';
  return '';
}
export function Badge({ children, cls }: { children: ReactNode; cls?: string }) {
  return <span className={`badge ${cls ?? (typeof children === 'string' ? badgeClass(children) : '')}`}>{children}</span>;
}

/** Topbar (menu button + title) and the flash message; every /app page renders its content inside <Page>. */
export function Page({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <>
      <div className="topbar"><div className="row"><MenuButton /><h1>{title}</h1></div>{actions && <div className="row noprint">{actions}</div>}</div>
      <FlashBar />
      {children}
    </>
  );
}

/** Dashboard stat tile; `href` makes it a link; `tone` colours the number. */
export function Stat({ n, label, href, tone }: { n: ReactNode; label: string; href?: string; tone?: 'pos' | 'neg' }) {
  const body = (<><div className="n">{n}</div><div className="l">{label}</div></>);
  return href
    ? <Link href={href} className={`stat ${tone ?? ''}`} style={{ textDecoration: 'none', color: 'inherit' }}>{body}</Link>
    : <div className={`stat ${tone ?? ''}`}>{body}</div>;
}
export const Stats = ({ children }: { children: ReactNode }) => <div className="stats">{children}</div>;

/** Sortable column header: links to ?sort=<key>&dir=... keeping the other filters. */
export function SortTh({ list, label, k, cls = '' }: { list: Pick<Page, 'qs'>; label: string; k: string; cls?: string }) {
  const p = new URLSearchParams(list.qs);
  const cur = p.get('sort') === k, dir = p.get('dir') === 'asc' ? 'asc' : 'desc';
  p.set('sort', k); p.set('dir', cur && dir === 'desc' ? 'asc' : 'desc');
  return <th className={cls}><Link href={`?${p.toString()}`}>{label}{cur ? (dir === 'asc' ? ' ▲' : ' ▼') : ''}</Link></th>;
}

export function Pager({ list }: { list: Pick<Page, 'page' | 'pages' | 'total' | 'qs'> }) {
  const href = (n: number) => `?${list.qs ? list.qs + '&' : ''}page=${n}`;
  if (list.pages <= 1) return <p className="muted small right">{list.total} record{list.total === 1 ? '' : 's'}</p>;
  return (
    <nav className="pager noprint" aria-label="Pagination">
      {list.page > 1 && <Link className="btn ghost sm" href={href(list.page - 1)}>← Prev</Link>}
      <span className="cur">Page {list.page} of {list.pages} · {list.total} records</span>
      {list.page < list.pages && <Link className="btn ghost sm" href={href(list.page + 1)}>Next →</Link>}
    </nav>
  );
}

/** Pretty "YYYY-MM-DD HH:mm" from a stored timestamp. */
export const dt = (s: string | null | undefined) => (s ? s.slice(0, 16) : '');
