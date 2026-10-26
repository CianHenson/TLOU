'use client';
// Monitoring Finances table with file-explorer style row selection: click selects one, Ctrl/Cmd+click toggles,
// Shift+click selects a range, and dragging from empty space draws a box that selects the rows it touches
// (from inside the table or from the empty page around it; hold Ctrl/Cmd or Shift to add to the current selection). Esc or a click on empty space clears. The footer
// shows the total of the selected rows next to the overall total.
import { useEffect, useRef, useState } from 'react';
import { longDate, peso } from '@/lib/util';
import type { FinanceRow } from '@/lib/queries/finance-monitor';
import { useRouter } from 'next/navigation';
import { ReceiptLink } from './receipt-viewer';
import { ExpenseEditModal } from './expense-edit-modal';
import { useFlash } from './flash';

const Dash = () => <span className="muted">—</span>;

export function FinanceTable({ rows, total, totalLabel, today }: { rows: FinanceRow[]; total: number; totalLabel: string; today: string }) {
  const router = useRouter();
  const { show } = useFlash();
  const [menu, setMenu] = useState<{ x: number; y: number; ids: number[] } | null>(null);
  const [editing, setEditing] = useState<FinanceRow | null>(null);
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const anchor = useRef<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);

  // Drop selections that the filters have since removed from the list.
  useEffect(() => { setSel((s) => new Set([...s].filter((id) => rows.some((r) => r.id === id)))); }, [rows]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setSel(new Set()); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  const clickRow = (e: React.MouseEvent, i: number) => {
    if ((e.target as Element).closest('.rc-link')) return;
    const id = rows[i].id;
    if (e.shiftKey && anchor.current !== null) {
      const [a, b] = [Math.min(anchor.current, i), Math.max(anchor.current, i)];
      const range = rows.slice(a, b + 1).map((r) => r.id);
      setSel(e.ctrlKey || e.metaKey ? new Set([...sel, ...range]) : new Set(range));
    } else if (e.ctrlKey || e.metaKey) {
      const n = new Set(sel);
      if (n.has(id)) n.delete(id); else n.add(id);
      setSel(n); anchor.current = i;
    } else { setSel(new Set([id])); anchor.current = i; }
  };

  const selRef = useRef(sel);
  selRef.current = sel;
  // Rubber-band selection: can start anywhere that isn't an interactive element or a row (the page background around the
  // table counts), is tracked on the window, and only selects rows inside the table's visible area. Near the top / bottom
  // edge of the table it auto-scrolls.
  useEffect(() => {
    const down = (e: MouseEvent) => {
      const area = wrap.current;
      const t = e.target as Element;
      if (!area || e.button !== 0 || t.closest('tr:not(.fill), thead, tfoot, a, button, input, select, textarea, label, dialog, aside, .dd-list, .ctx-menu, [role=listbox], [role=dialog]')) return;
      if (area.contains(t) && e.clientX > area.getBoundingClientRect().left + area.clientWidth) return; // the scrollbar
      e.preventDefault();
      const add = e.ctrlKey || e.metaKey || e.shiftKey;
      const base = add ? new Set(selRef.current) : new Set<number>();
      const x0 = e.clientX, y0 = e.clientY;
      let mx = x0, my = y0, moved = false, timer: ReturnType<typeof setInterval> | undefined;
      const update = () => {
        const b = { x: Math.min(x0, mx), y: Math.min(y0, my), w: Math.abs(mx - x0), h: Math.abs(my - y0) };
        setBox(b);
        const view = area.getBoundingClientRect();
        const top = Math.max(view.top, area.querySelector('thead')?.getBoundingClientRect().bottom ?? view.top);
        const bottom = Math.min(view.bottom, area.querySelector('tfoot')?.getBoundingClientRect().top ?? view.bottom);
        const hit = new Set(base);
        area.querySelectorAll<HTMLElement>('tbody tr[data-id]').forEach((tr) => {
          const q = tr.getBoundingClientRect();
          const vTop = Math.max(q.top, top), vBottom = Math.min(q.bottom, bottom);
          if (vBottom > vTop && q.right > b.x && q.left < b.x + b.w && vBottom > b.y && vTop < b.y + b.h) hit.add(Number(tr.dataset.id));
        });
        setSel(hit);
      };
      const move = (m: MouseEvent) => {
        mx = m.clientX; my = m.clientY;
        if (!moved && Math.hypot(mx - x0, my - y0) < 4) return;
        moved = true;
        update();
        timer ??= setInterval(() => {
          const v = area.getBoundingClientRect();
          const dy = my < v.top + 40 ? -14 : my > v.bottom - 40 ? 14 : 0;
          if (dy) { area.scrollTop += dy; update(); }
        }, 30);
      };
      const up = () => {
        window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up);
        clearInterval(timer);
        setBox(null);
        if (!moved && !add) setSel(new Set()); // plain click on empty space clears
      };
      window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, []);

  // Right-click: on an unselected row it selects that row first; on a selected one it acts on the whole selection.
  const context = (e: React.MouseEvent, i: number) => {
    if ((e.target as Element).closest('.rc-link')) return;
    e.preventDefault();
    const id = rows[i].id;
    let ids = [...sel];
    if (!sel.has(id)) { ids = [id]; setSel(new Set(ids)); anchor.current = i; }
    setMenu({ x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 110), ids });
  };
  useEffect(() => {
    if (!menu) return;
    const close = (e: Event) => { if (!(e.target as Element).closest?.('.ctx-menu')) setMenu(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(null); };
    const scroll = () => setMenu(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', scroll, true);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); window.removeEventListener('scroll', scroll, true); };
  }, [menu]);
  const remove = async (ids: number[]) => {
    setMenu(null);
    const n = ids.length;
    if (!window.confirm(n === 1 ? 'Delete this expense? It will be removed from the list and totals.' : `Delete these ${n} expenses? They will be removed from the list and totals.`)) return;
    const fd = new FormData(); fd.set('ids', ids.join(','));
    try {
      const res = await fetch('/api/expenses/bulk-delete', { method: 'POST', body: fd, credentials: 'same-origin' });
      const d = await res.json();
      show(d.ok ? 'ok' : 'err', d.msg || (d.ok ? 'Deleted.' : 'Could not delete.'));
      if (d.ok) { setSel(new Set()); router.refresh(); }
    } catch { show('err', 'Network error. Please try again.'); }
  };

  const picked = rows.filter((r) => sel.has(r.id));
  return (
    <div className="tw tw-fixed tw-fm" ref={wrap}>
      <table>
        <thead><tr><th>Date</th><th>Type of Expense</th><th>Description / Remarks</th><th>Payment Method</th><th>Receipt</th><th>Modified By</th><th className="num">Amount</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} data-id={r.id} className={sel.has(r.id) ? 'sel' : undefined} aria-selected={sel.has(r.id)} onClick={(e) => clickRow(e, i)} onContextMenu={(e) => context(e, i)}>
              <td className="nowrap">{longDate(r.date)}</td><td>{r.type}</td><td>{r.description || <Dash />}</td><td>{r.method || <Dash />}</td>
              <td>{r.receipt ? <ReceiptLink id={r.id} label={r.receiptName} kind={r.receipt.toLowerCase().endsWith('.pdf') ? 'pdf' : 'img'} /> : <Dash />}</td>
              <td>{r.by || <Dash />}</td><td className="num"><strong>{peso(r.amount)}</strong></td>
            </tr>
          ))}
          {!!rows.length && <tr className="fill"><td colSpan={7} /></tr>}
          {!rows.length && <tr><td colSpan={7} className="empty">No expenses recorded for these dates.</td></tr>}
        </tbody>
        {!!rows.length && (
          <tfoot>
            {!!picked.length && <tr className="sel-total"><td colSpan={6}>Selected — {picked.length} {picked.length === 1 ? 'expense' : 'expenses'}</td><td className="num">{peso(picked.reduce((s, r) => s + r.amount, 0))}</td></tr>}
            <tr><td colSpan={6}>{totalLabel}</td><td className="num">{peso(total)}</td></tr>
          </tfoot>
        )}
      </table>
      {menu && (
        <div className="ctx-menu" role="menu" style={{ left: menu.x, top: menu.y }} onContextMenu={(e) => e.preventDefault()}>
          {menu.ids.length === 1 && <button type="button" role="menuitem" onClick={() => { setEditing(rows.find((r) => r.id === menu.ids[0]) ?? null); setMenu(null); }}>Edit</button>}
          <button type="button" role="menuitem" className="danger" onClick={() => remove(menu.ids)}>{menu.ids.length === 1 ? 'Delete' : `Delete ${menu.ids.length} expenses`}</button>
        </div>
      )}
      {editing && <ExpenseEditModal key={editing.id} expense={editing} today={today} onClose={() => setEditing(null)} />}
      {box && <div className="sel-box" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />}
    </div>
  );
}
