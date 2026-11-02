'use client';
// Payroll Deductions (owner / admin): Add Deduction / Edit in a modal, activate or deactivate in one click, and the change history.
// Percentages are typed in by the owner - nothing is pre-filled - and checked again on the server.
import { useEffect, useState } from 'react';
import { ApiForm, Field, Submit } from './form';
import { Dropdown } from './dropdown';
import { DateField } from './date-time-picker';
import { Modal, usePost } from './modal';
import { FootLine } from './ui';
import { ModBy } from './mod-by';
import { KebabMenu } from './kebab-menu';
import { useRowSelection } from './row-select';
import { dt12 } from '@/lib/util';
import { DEDUCTION_BASES, DEDUCTION_KINDS, pct } from '@/lib/deduction-shared';

export interface DeductionItem {
  id: number; name: string; kind: string; basis: string; rate_bp: number; active: number; effective_from: string;
  next_bp: number | null; next_active: number | null; next_from: string | null; mod_by?: string; mod_at?: string;
}
export interface HistoryItem { id: number; name: string; rate_bp: number; active: number; effective_from: string; changed_at: string; by_name: string | null }

const addDays = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };

function DeductionDialog({ d, today, onClose }: { d?: DeductionItem; today: string; onClose: () => void }) {
  return (
    <Modal title={d ? `Edit deduction — ${d.name}` : 'Add deduction'} onClose={onClose} width={520}>
      {(close) => (
        <ApiForm action={d ? `/api/deductions/${d.id}` : '/api/deductions'} stay onDone={(r) => { if (r.ok) close(); }}>
          <Field name="name" label="Deduction Name *" defaultValue={d?.name} hint="e.g. SSS, PhilHealth, Pag-IBIG, Withholding Tax."
            attrs={{ required: true, maxLength: 80, autoFocus: true, placeholder: 'Deduction name' }} />
          <div className="grid g2">
            <Field name="rate" label="Deduction Percentage (%) *" defaultValue={d ? String(d.rate_bp / 100) : ''} attrs={{ required: true, inputMode: 'decimal', maxLength: 7, placeholder: 'e.g. 5' }} />
            <div className="field"><label>Status *</label>
              <Dropdown name="active" ariaLabel="Status" options={['Active', 'Inactive']} defaultValue={d ? (d.active ? 'Active' : 'Inactive') : 'Active'} style={{ width: '100%' }} /></div>
          </div>
          <DateField name="effective_from" label="Effective from *" defaultValue={today} min={addDays(today, -365)} max={addDays(today, 365)} today={today} required />
          <p className="small muted">Type: {DEDUCTION_KINDS.percent} of {DEDUCTION_BASES.gross.toLowerCase()}. Applies to payroll periods ending on or after the effective date; payroll already generated is never changed. Enter and verify the rate yourself: statutory contributions and withholding tax can have their own brackets, ceilings and rules.</p>
          <div className="row"><Submit>{d ? 'Save changes' : 'Add deduction'}</Submit> <button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
        </ApiForm>
      )}
    </Modal>
  );
}

export const NEW_DEDUCTION_EVT = 'deduction:new';

export function AddDeductionButton({ today }: { today: string }) {
  const [open, setOpen] = useState(false);
  useEffect(() => { // also opened from the table's right-click menu
    const h = () => setOpen(true);
    window.addEventListener(NEW_DEDUCTION_EVT, h);
    return () => window.removeEventListener(NEW_DEDUCTION_EVT, h);
  }, []);
  return (
    <>
      <button type="button" className="icon-btn" aria-label="Add deduction" title="Add deduction" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      {open && <DeductionDialog today={today} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Information icon: click to show how deductions work (fixed-position so the page header can't clip it). */
export function DeductionInfoButton() {
  const [pos, setPos] = useState<{ right: number; top: number } | null>(null);
  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    window.addEventListener('click', close);
    window.addEventListener('keydown', key);
    window.addEventListener('resize', close);
    document.addEventListener('scroll', close, true);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', key);
      window.removeEventListener('resize', close);
      document.removeEventListener('scroll', close, true);
    };
  }, [pos]);
  return (
    <>
      <button type="button" className="icon-btn plain" aria-label="About payroll deductions" title="About payroll deductions" aria-haspopup="dialog" aria-expanded={!!pos}
        onClick={(e) => { e.stopPropagation(); if (pos) return setPos(null); const b = e.currentTarget.getBoundingClientRect(); setPos({ right: Math.max(8, window.innerWidth - b.right), top: b.bottom + 8 }); }}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 11v6" /><circle cx="12" cy="7.5" r=".6" fill="currentColor" /></svg>
      </button>
      {pos && (
        <div className="ctx-menu" role="dialog" aria-label="About payroll deductions" style={{ left: 'auto', right: pos.right, top: pos.top, width: 'min(380px, calc(100vw - 16px))', padding: '12px 14px', display: 'block' }} onClick={(e) => e.stopPropagation()}>
          <p className="small" style={{ margin: 0 }}>
            Set up the government and payroll deductions here. Only <strong>active</strong> deductions are applied to newly generated payroll, each shown separately on the payslip as
            gross salary × percentage. No rates are assumed: enter and verify the rates and basis that apply to your company. Payroll that was already generated is never changed.
          </p>
        </div>
      )}
    </>
  );
}

export function HistoryButton({ rows }: { rows: HistoryItem[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn ghost" onClick={() => setOpen(true)} aria-haspopup="dialog">Change history</button>
      {open && (
        <Modal title="Deduction change history" onClose={() => setOpen(false)} width={720}>
          {() => (
            <div className="tw" style={{ maxHeight: '60vh', overflow: 'auto' }}><table>
              <thead><tr><th>Deduction</th><th>Rate</th><th>Status</th><th>Effective from</th><th>Changed</th></tr></thead>
              <tbody>
                {rows.map((h) => (
                  <tr key={h.id}><td><strong>{h.name}</strong></td><td>{pct(h.rate_bp)}</td>
                    <td><span className={`badge ${h.active ? 'b-ok' : 'b-err'}`}>{h.active ? 'Active' : 'Inactive'}</span></td>
                    <td className="nowrap">{h.effective_from}</td><td className="nowrap">{dt12(h.changed_at)}<div className="small muted">{h.by_name || '—'}</div></td></tr>
                ))}
                {!rows.length && <tr><td colSpan={5} className="empty">No changes recorded yet.</td></tr>}
              </tbody></table></div>
          )}
        </Modal>
      )}
    </>
  );
}

export function DeductionTable({ rows, total, today }: { rows: DeductionItem[]; total: number; today: string }) {
  const [edit, setEdit] = useState<DeductionItem | null>(null);
  const { post, busy } = usePost();
  const { wrap, sel, menu, setMenu, rowProps, selBox, emptyMenu } = useRowSelection(rows.map((r) => r.id), 110);
  const setActive = (ids: number[], active: boolean) => { setMenu(null); post('/api/deductions/bulk-status', { ids: ids.join(','), active: active ? '1' : '0' }); };
  // Right-click actions for the clicked row, or for the whole selection when the row is part of it.
  const itemsFor = (ids: number[]) => {
    const picked = rows.filter((r) => ids.includes(r.id));
    const on = picked.filter((r) => r.active), off = picked.filter((r) => !r.active);
    const out: { label: string; run: () => void; danger?: boolean }[] = [];
    if (picked.length === 1) out.push({ label: 'Edit', run: () => { setMenu(null); setEdit(picked[0]); } });
    if (on.length) out.push({ label: on.length === 1 ? 'Deactivate' : `Deactivate ${on.length} deductions`, danger: true, run: () => setActive(on.map((r) => r.id), false) });
    if (off.length) out.push({ label: off.length === 1 ? 'Activate' : `Activate ${off.length} deductions`, run: () => setActive(off.map((r) => r.id), true) });
    return out;
  };
  return (
    <div className="tw tw-fixed tw-fm tw-sel" ref={wrap} onContextMenu={emptyMenu}>
      <table><colgroup><col style={{ width: '24%' }} /><col style={{ width: '14%' }} /><col style={{ width: '11%' }} /><col style={{ width: '12%' }} /><col style={{ width: '17%' }} /><col style={{ width: '16%' }} /><col style={{ width: 56 }} /></colgroup>
        <thead><tr><th>Deduction</th><th>Calculated on</th><th style={{ textAlign: 'center' }}>Percentage</th><th>Status</th><th>Effective from</th><th>Modified by</th><th></th></tr></thead>
        <tbody>
          {rows.map((d, i) => (
            <tr key={d.id} {...rowProps(i, d.active ? '' : 'off')} title="Double-click to edit"
              onDoubleClick={(e) => { if (!(e.target as Element).closest('a, button, input, select, textarea, label')) setEdit(d); }}>
              <td><strong>{d.name}</strong></td>
              <td>{DEDUCTION_BASES[d.basis] ?? d.basis}</td>
              <td style={{ textAlign: 'center' }}>{pct(d.rate_bp)}</td>
              <td><span className={`badge ${d.active ? 'b-ok' : 'b-err'}`}>{d.active ? 'Active' : 'Inactive'}</span>
                {d.effective_from > today && <div className="small muted">starts {d.effective_from}</div>}</td>
              <td className="nowrap">{d.effective_from}
                {d.next_from && <div className="small muted">then {d.next_active ? pct(d.next_bp!) : 'inactive'} from {d.next_from}</div>}</td>
              <td className="small"><ModBy r={d} /></td>
              <td className="nowrap" style={{ textAlign: 'right' }}>
                <KebabMenu label={`Actions for ${d.name}`} items={[
                  { label: 'Edit', onClick: () => setEdit(d) },
                  { label: d.active ? 'Deactivate' : 'Activate', danger: !!d.active, disabled: busy, onClick: () => setActive([d.id], !d.active) },
                ]} />
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={7} className="empty"><strong>No deductions set up yet.</strong><br /><span className="small muted">Payroll has no deductions until you add them with Add Deduction.</span></td></tr>}
          {!!rows.length && <tr className="fill"><td colSpan={7} /></tr>}
        </tbody>
        {!!rows.length && <FootLine cols={7} total={total} selected={rows.filter((r) => sel.has(r.id)).length} />}
      </table>
      {menu && (
        <div className="ctx-menu" role="menu" style={{ left: menu.x, top: menu.y }} onContextMenu={(e) => e.preventDefault()}>
          {!menu.ids.length && <button type="button" role="menuitem" onClick={() => { setMenu(null); window.dispatchEvent(new Event(NEW_DEDUCTION_EVT)); }}>Add deduction</button>}
          {itemsFor(menu.ids).map((i) => <button key={i.label} type="button" role="menuitem" className={i.danger ? 'danger' : undefined} onClick={i.run}>{i.label}</button>)}
        </div>
      )}
      {edit && <DeductionDialog key={edit.id + edit.effective_from} d={edit} today={today} onClose={() => setEdit(null)} />}
      {selBox}
    </div>
  );
}
