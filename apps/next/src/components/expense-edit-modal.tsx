'use client';
import { useRef } from 'react';
import { ApiForm, Field, Submit } from './form';
import { CategoryField, MethodField } from './expense-fields';
import { DateField } from './date-time-picker';
import { moneyInput } from './input-format';
import { ShellPortal } from './shell-portal';

export interface EditableExpense { id: number; date: string; type: string; description: string; method: string; amount: number; receiptName: string }

/** Edit-expense dialog for Monitoring Finances; posts to /api/expenses/[id]/edit. Mounted only while editing (keyed by id). */
export function ExpenseEditModal({ expense, today, categories, onClose }: { expense: EditableExpense; today: string; categories: string[]; onClose: () => void }) {
  const dlg = useRef<HTMLDialogElement | null>(null);
  // ShellPortal mounts its children a render late, so open the dialog when the element actually attaches.
  const attach = (el: HTMLDialogElement | null) => { dlg.current = el; if (el && !el.open) el.showModal(); };
  return (
    <ShellPortal>
      <dialog ref={attach} className="modal wide" style={{ width: 'min(620px, calc(100vw - 32px))' }} aria-labelledby="ee-title"
        onClose={onClose} onClick={(e) => { if (e.target === dlg.current) dlg.current?.close(); }}>
        <div className="modal-head">
          <h3 id="ee-title">Edit expense</h3>
          <button type="button" className="modal-x" aria-label="Close" onClick={() => dlg.current?.close()}>×</button>
        </div>
        <div className="modal-body">
          <ApiForm action={`/api/expenses/${expense.id}/edit`} onDone={(d) => { if (d.ok) dlg.current?.close(); }}>
            <div className="grid g2">
              <DateField name="spent_at" label="Date *" defaultValue={expense.date} max={today} today={today} required />
              <Field name="amount" label="Amount (₱) *" defaultValue={(expense.amount / 100).toFixed(2)} attrs={{ inputMode: 'decimal', placeholder: '0.00', required: true, onInput: moneyInput }} />
              <CategoryField categories={categories.includes(expense.type) ? categories : [...categories, expense.type]} defaultValue={expense.type} label="Type of expense *" />
              <MethodField defaultValue={expense.method} />
            </div>
            <Field name="description" label="Description *" defaultValue={expense.description} attrs={{ maxLength: 500, required: true }} />
            <div className="field">
              <label htmlFor="ee-receipt">Receipt (PDF/JPG/PNG, max 5 MB)</label>
              <input id="ee-receipt" type="file" name="receipt" accept=".pdf,.jpg,.jpeg,.png" />
              <div className="small muted">{expense.receiptName ? `Current: ${expense.receiptName}. Choose a file only to replace it.` : 'No receipt uploaded yet.'}</div>
            </div>
            <div className="row"><Submit>Save changes</Submit> <button type="button" className="btn ghost" onClick={() => dlg.current?.close()}>Cancel</button></div>
          </ApiForm>
        </div>
      </dialog>
    </ShellPortal>
  );
}
