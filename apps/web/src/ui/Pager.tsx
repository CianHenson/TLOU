/** Page navigation under a list (original `.pager`). `onPage` receives the new 1-based page. */
export default function Pager({ page, pages, total, onPage }: { page: number; pages: number; total: number; onPage: (p: number) => void }) {
  if (pages <= 1) return <p className="muted small" style={{ textAlign: 'center' }}>{total} record{total === 1 ? '' : 's'}</p>;
  return (
    <div className="pager noprint">
      <button className="btn ghost sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>← Prev</button>
      <span className="cur">Page {page} of {pages}</span>
      <span className="muted small">({total} records)</span>
      <button className="btn ghost sm" disabled={page >= pages} onClick={() => onPage(page + 1)}>Next →</button>
    </div>
  );
}
