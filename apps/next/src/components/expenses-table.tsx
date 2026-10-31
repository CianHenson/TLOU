'use client';
// Expenses table (Owner/Admin and Staff share it): same layout as Airfare Sales / Monitoring Finances, with row selection and a
// right-click menu. The server already limits staff to their own expenses; `meId` / `owner` only decide which rows show Edit and
// Delete here (the API checks again). The footer shows the count and the total of the selection, or of everything filtered.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { longDate, peso } from '@/lib/util';
import { ReceiptLink } from './receipt-viewer';
import { ExpenseEditModal } from './expense-edit-modal';
import { useFlash } from './flash';
import { FootLine } from './ui';
import { useRowSelection } from './row-select';
import { NEW_EXPENSE_EVT } from './expense-modal';

export interface ExpenseRow { id: number; date: string; type: string; description: string; method: string; amount: number; by: string; userId: number | null; receipt: string; receiptName: string }

const Dash = () => <span className="muted">—</span>;

export function ExpensesTable({ rows, total, count, today, owner, meId }: { rows: ExpenseRow[]; total: number; count: number; today: string; owner: boolean; meId: number }) {
  const router = useRouter();
  const { show } = useFlash();
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const { wrap, sel, setSel, menu, setMenu, rowProps, selBox, emptyMenu } = useRowSelection(rows.map((r) => r.id));
  const mine = (id: number) => owner || rows.find((r) => r.id === id)?.userId === meId;

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
    <div className="tw tw-fixed tw-fm tw-sel" ref={wrap} onContextMenu={emptyMenu}>
      <table><colgroup><col /><col /><col style={{ width: '26%' }} /></colgroup>
        <thead><tr><th>Date</th><th>Type of Expense</th><th>Description / Remarks</th><th>Payment Method</th><th>Receipt</th><th>Recorded By</th><th className="num">Amount</th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} {...rowProps(i)} title={mine(r.id) ? 'Double-click to edit' : undefined}
              onDoubleClick={(e) => { if (mine(r.id) && !(e.target as Element).closest('a, button, input, select, textarea, label')) setEditing(r); }}>
              <td className="nowrap">{longDate(r.date)}</td><td>{r.type}</td><td>{r.description || <Dash />}</td><td>{r.method || <Dash />}</td>
              <td>{r.receipt ? <ReceiptLink id={r.id} label={r.receiptName} kind={r.receipt.toLowerCase().endsWith('.pdf') ? 'pdf' : 'img'} /> : <Dash />}</td>
              <td>{r.by || <Dash />}</td><td className="num"><strong>{peso(r.amount)}</strong></td>
            </tr>
          ))}
          {!!rows.length && <tr className="fill"><td colSpan={7} /></tr>}
          {!rows.length && <tr><td colSpan={7} className="empty"><span className="empty-msg">No expenses found.</span></td></tr>}
        </tbody>
        {!!rows.length && <FootLine cols={7} total={count} selected={picked.length}
          right={`Total cost: ${peso(picked.length ? picked.reduce((s, r) => s + r.amount, 0) : total)}`} />}
      </table>
      {menu && (
        <div className="ctx-menu" role="menu" style={{ left: menu.x, top: menu.y }} onContextMenu={(e) => e.preventDefault()}>
          {!menu.ids.length && <button type="button" role="menuitem" onClick={() => { setMenu(null); window.dispatchEvent(new Event(NEW_EXPENSE_EVT)); }}>Add expense</button>}
          {menu.ids.length === 1 && mine(menu.ids[0]) && <button type="button" role="menuitem" onClick={() => { setEditing(rows.find((r) => r.id === menu.ids[0]) ?? null); setMenu(null); }}>Edit</button>}
          {!!menu.ids.length && menu.ids.every(mine) && <button type="button" role="menuitem" className="danger" onClick={() => remove(menu.ids)}>{menu.ids.length === 1 ? 'Delete' : `Delete ${menu.ids.length} expenses`}</button>}
          {!!menu.ids.length && !menu.ids.every(mine) && <button type="button" role="menuitem" onClick={() => setMenu(null)}>Only the person who recorded an expense can change it</button>}
        </div>
      )}
      {editing && <ExpenseEditModal key={editing.id} expense={{ id: editing.id, date: editing.date, type: editing.type, description: editing.description, method: editing.method, amount: editing.amount, receiptName: editing.receiptName }}
        today={today} onClose={() => setEditing(null)} />}
      {selBox}
    </div>
  );
}
