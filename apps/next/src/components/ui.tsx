// Server-rendered building blocks that reproduce the old EJS partials (th, pager, stat, badge, page header).
import Link from 'next/link';
import type { ReactNode } from 'react';
import { FlashBar } from './flash';
import { MenuButton } from './widgets';
import type { Page } from '@/lib/list';
import { dt12 } from '@/lib/util';

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

/**
 * Module header (menu button + title + the page's filter form + actions, in a sticky glass bar) and the flash message;
 * every /app page renders its content inside <Page>. `filters` is usually a GET `<form className="filters">`.
 */
export function Page({ title, actions, filters, children }: { title: string; actions?: ReactNode; filters?: ReactNode; children: ReactNode }) {
  return (
    <>
      <header className="mhead">
        <div className="mh-title"><MenuButton /><h1>{title}</h1></div>
        {filters && <div className="mh-tools">{filters}</div>}
        {actions && <div className="row noprint mh-actions">{actions}</div>}
      </header>
      <FlashBar toast />
      {children}
    </>
  );
}

/** Dashboard stat tile; `href` makes it a link; `tone` colours the number. */
export function Stat({ n, label, href, tone, icon }: { n: ReactNode; label: string; href?: string; tone?: 'pos' | 'neg'; icon?: string }) {
  const body = (<>{icon && <span className="si" aria-hidden="true">{icon}</span>}<div className="n">{n}</div><div className="l">{label}</div></>);
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

/**
 * One-line table footer used by every list table: the record count on the left ("All records: N", or "Selected records:
 * x/N" in the gold selection style while rows are selected) and, only where the table has one, a total on the right edge.
 */
export function FootLine({ cols, total, selected = 0, right }: { cols: number; total: number; selected?: number; right?: ReactNode }) {
  return (
    <tfoot><tr className={selected ? 'sel-total' : undefined}><td colSpan={cols}><div className="foot-line">
      <span>{selected ? `Selected records: ${selected}/${total}` : `All records: ${total}`}</span>
      {right != null && right !== false && <span>{right}</span>}
    </div></td></tr></tfoot>
  );
}

/** Page links; nothing on a single page (the table's FootLine already shows the record count). */
export function Pager({ list }: { list: Pick<Page, 'page' | 'pages' | 'total' | 'qs'> }) {
  const href = (n: number) => `?${list.qs ? list.qs + '&' : ''}page=${n}`;
  if (list.pages <= 1) return null;
  return (
    <nav className="pager noprint" aria-label="Pagination">
      {list.page > 1 && <Link className="btn ghost sm" href={href(list.page - 1)}>← Prev</Link>}
      <span className="cur">Page {list.page} of {list.pages} · {list.total} records</span>
      {list.page < list.pages && <Link className="btn ghost sm" href={href(list.page + 1)}>Next →</Link>}
    </nav>
  );
}

/** Pretty "YYYY-MM-DD 3:55 PM" from a stored timestamp. */
export const dt = (s: string | null | undefined) => dt12(s);
