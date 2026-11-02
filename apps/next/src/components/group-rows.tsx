// Group headings for list tables (see sort-group.tsx). Plain module so server pages and client tables can both use it.
import { Fragment, type ReactNode } from 'react';

/** The table body rows with a heading row ("Label · count") before each run of rows that share a group. */
export function groupedRows<T>(rows: T[], groupOf: ((r: T) => string) | null, cols: number, render: (r: T, i: number) => ReactNode): ReactNode {
  if (!groupOf) return rows.map((r, i) => render(r, i));
  const counts = new Map<string, number>();
  for (const r of rows) { const g = groupOf(r); counts.set(g, (counts.get(g) ?? 0) + 1); }
  let prev: string | null = null;
  return rows.map((r, i) => {
    const g = groupOf(r), head = g !== prev;
    prev = g;
    return (
      <Fragment key={i}>
        {head && <tr className="grp"><td colSpan={cols}><strong>{g || '—'}</strong><span className="muted small"> · {counts.get(g)}</span></td></tr>}
        {render(r, i)}
      </Fragment>
    );
  });
}

/** "November 2026" for a YYYY-MM-DD date (a group heading). */
export const monthOf = (d: string) => (d ? new Date(d.slice(0, 7) + '-01T00:00:00').toLocaleDateString('en-PH', { month: 'long', year: 'numeric' }) : '—');
