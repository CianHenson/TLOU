'use client';
// Monitoring Finances table (Owner/Admin and Staff share it): same layout as Airfare Sales, with row selection and a
// right-click menu. Everyone sees every expense; `meId` / `owner` decide which rows show Edit and Delete here (the API checks again). The footer shows the count and the total of the selection, or of everything filtered.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { longDate, peso } from '@/lib/util';
import { ReceiptLink } from './receipt-viewer';
import { ExpenseEditModal } from './expense-edit-modal';
import { useFlash } from './flash';
import { FootLine } from './ui';
import { ModBy } from './mod-by';
import { useRowSelection } from './row-select';
import { askConfirm } from './confirm';
import { NEW_EXPENSE_EVT } from './expense-modal';
import { SortGroupItems, useGroupOf, type SortGroup } from './sort-group';
import { groupedRows, monthOf } from './group-rows';

export interface ExpenseRow { id: number; date: string; type: string; description: string; method: string; amount: number; by: string; userId: number | null; receipt: string; receiptName: string; mod_by?: string; mod_at?: string }

const SG: SortGroup = {
  sorts: [['date', 'Date'], ['type', 'Type of Expense'], ['description', 'Description'], ['method', 'Payment Method'], ['by', 'Recorded By'], ['amount', 'Amount']],
  groups: [['type', 'Type of Expense'], ['method', 'Payment Method'], ['month', 'Month'], ['by', 'Recorded By']],
};

const Dash = () => <span className="muted">—</span>;

export function ExpensesTable({ rows, total, count, today, owner, meId, categories }: { categories: string[]; rows: ExpenseRow[]; total: number; count: number; today: string; owner: boolean; meId: number }) {
  const router = useRouter();
  const { show } = useFlash();
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const { wrap, sel, setSel, menu, setMenu, rowProps, selBox, emptyMenu } = useRowSelection(rows.map((r) => r.id));
  const mine = (id: number) => owner || rows.find((r) => r.id === id)?.userId === meId;

  const remove = async (ids: number[]) => {
    setMenu(null);
    const n = ids.length;
    if (!(await askConfirm({ title: n === 1 ? 'Delete expense' : `Delete ${n} expenses`, danger: true, confirmLabel: 'Delete', message: `${n === 1 ? 'Delete this expense?' : `Delete these ${n} expenses?`} It will be removed from the list and totals. ${(owner ? 'It will be moved to the Delete Archive, where it can be restored.' : 'You can still retrieve it from the Trash tab within 30 days.')}` }))) return;
    const fd = new FormData(); fd.set('ids', ids.join(','));
    try {
      const res = await fetch('/api/expenses/bulk-delete', { method: 'POST', body: fd, credentials: 'same-origin' });
      const d = await res.json();
      show(d.ok ? 'ok' : 'err', d.msg || (d.ok ? 'Deleted.' : 'Could not delete.'));
      if (d.ok) { setSel(new Set()); router.refresh(); }
    } catch { show('err', 'Network error. Please try again.'); }
  };

  const groupOf = useGroupOf<typeof rows[number]>({ type: (r) => r.type, method: (r) => r.method || '—', month: (r) => monthOf(r.date), by: (r) => r.by || '—' });
  const picked = rows.filter((r) => sel.has(r.id));
  return (
    <div className="tw tw-fixed tw-fm tw-sel fin-tw" ref={wrap} onContextMenu={emptyMenu}>
      <table><colgroup>{[12, 13, 19, 13, 8, 13, 11, 11].map((w, i) => <col key={i} style={{ width: w + '%' }} />)}</colgroup>
        <thead><tr><th>Date</th><th>Type of Expense</th><th>Description</th><th>Payment Method</th><th>Receipt</th><th>Recorded By</th><th className="num">Amount</th><th>Modified by</th></tr></thead>
        <tbody>
          {groupedRows(rows, groupOf, 8, (r, i) => (
            <tr key={r.id} {...rowProps(i)} title={mine(r.id) ? 'Double-click to edit' : undefined}
              onDoubleClick={(e) => { if (mine(r.id) && !(e.target as Element).closest('a, button, input, select, textarea, label')) setEditing(r); }}>
              <td className="nowrap">{longDate(r.date)}</td><td>{r.type}</td><td>{r.description || <Dash />}</td><td>{r.method || <Dash />}</td>
              <td>{r.receipt ? <ReceiptLink id={r.id} label={r.receiptName} kind={r.receipt.toLowerCase().endsWith('.pdf') ? 'pdf' : 'img'} /> : <Dash />}</td>
              <td>{r.by || <Dash />}</td><td className="num"><strong>{peso(r.amount)}</strong></td><td className="small"><ModBy r={r} /></td>
            </tr>
          ))}
          {!!rows.length && <tr className="fill"><td colSpan={8} /></tr>}
          {!rows.length && <tr><td colSpan={8} className="empty"><span className="empty-msg">No expenses found.</span></td></tr>}
        </tbody>
        {!!rows.length && <FootLine cols={8} total={count} selected={picked.length}
          right={`Total cost: ${peso(picked.length ? picked.reduce((s, r) => s + r.amount, 0) : total)}`} />}
      </table>
      {menu && (
        <div className="ctx-menu" role="menu" style={{ left: menu.x, top: menu.y }} onContextMenu={(e) => e.preventDefault()}>
          {!menu.ids.length && <button type="button" role="menuitem" onClick={() => { setMenu(null); window.dispatchEvent(new Event(NEW_EXPENSE_EVT)); }}>Add expense</button>}
          {!menu.ids.length && <SortGroupItems sg={SG} done={() => setMenu(null)} />}
          {menu.ids.length === 1 && mine(menu.ids[0]) && <button type="button" role="menuitem" onClick={() => { setEditing(rows.find((r) => r.id === menu.ids[0]) ?? null); setMenu(null); }}>Edit</button>}
          {!!menu.ids.length && menu.ids.every(mine) && <button type="button" role="menuitem" className="danger" onClick={() => remove(menu.ids)}>{menu.ids.length === 1 ? 'Delete' : `Delete ${menu.ids.length} expenses`}</button>}
          {!!menu.ids.length && !menu.ids.every(mine) && <button type="button" role="menuitem" onClick={() => setMenu(null)}>Only the person who recorded an expense can change it</button>}
        </div>
      )}
      {editing && <ExpenseEditModal key={editing.id} categories={categories} expense={{ id: editing.id, date: editing.date, type: editing.type, description: editing.description, method: editing.method, amount: editing.amount, receiptName: editing.receiptName }}
        today={today} onClose={() => setEditing(null)} />}
      {selBox}
    </div>
  );
}
