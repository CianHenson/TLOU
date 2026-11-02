'use client';
// Airlines page: list with Add / Edit in a modal and Activate / Deactivate in one click. The active airlines are what the
// Airfare Sales form offers; existing sales keep the airline name they were saved with.
import { useEffect, useState } from 'react';
import { ApiForm, Field, Submit } from './form';
import { Modal, usePost } from './modal';
import { FootLine } from './ui';
import { ModBy } from './mod-by';
import { useRowSelection } from './row-select';
import { SortGroupItems, useGroupOf, type SortGroup } from './sort-group';
import { groupedRows } from './group-rows';

const SG: SortGroup = {
  sorts: [['name', 'Airline'], ['status', 'Status'], ['sales', 'Sales recorded'], ['updated', 'Last updated']],
  groups: [['status', 'Status']],
};

export interface AirlineRow { id: number; name: string; active: number; sales: number; updated_at: string | null; created_at: string; mod_by?: string; mod_at?: string }

function AirlineForm({ a, onClose }: { a?: AirlineRow; onClose: () => void }) {
  return (
    <Modal title={a ? 'Edit airline' : 'Add airline'} onClose={onClose} width={480}>
      {(close) => (
        <ApiForm action={a ? `/api/airlines/${a.id}` : '/api/airlines'} stay onDone={(d) => { if (d.ok) close(); }}>
          <Field name="name" label="Airline name *" defaultValue={a?.name} attrs={{ required: true, maxLength: 80, autoFocus: true }} />
          <label className="small" style={{ display: 'block', marginBottom: 12 }}><input type="checkbox" name="active" defaultChecked={a ? !!a.active : true} /> Active — offered when recording new airfare sales</label>
          {a && <p className="small muted">Existing sales keep the airline name they were saved with, even if you rename or deactivate it here.</p>}
          <div className="row"><Submit>{a ? 'Save changes' : 'Add airline'}</Submit> <button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
        </ApiForm>
      )}
    </Modal>
  );
}

export const NEW_AIRLINE_EVT = 'airline:new';

export function NewAirlineButton() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const h = () => setOpen(true);
    window.addEventListener(NEW_AIRLINE_EVT, h);
    return () => window.removeEventListener(NEW_AIRLINE_EVT, h);
  }, []);
  return (
    <>
      <button type="button" className="icon-btn" aria-label="Add airline" title="Add airline" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
      </button>
      {open && <AirlineForm onClose={() => setOpen(false)} />}
    </>
  );
}

type Item = { label: string; run: () => void };

/** Vertical "⋮" button with a menu opening to its right (fixed-position so the table's scroll box can't clip it). */
function RowActions({ items }: { items: Item[] }) {
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
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
      <button type="button" className="btn ghost sm" aria-label="Actions" aria-haspopup="menu" aria-expanded={!!pos} style={{ fontSize: '1.2rem', lineHeight: 1, padding: '.2em .6em' }}
        onClick={(e) => { e.stopPropagation(); if (pos) return setPos(null); const b = e.currentTarget.getBoundingClientRect(); setPos({ x: b.right + 6 + 170 <= window.innerWidth ? b.right + 6 : Math.max(8, b.left - 176), y: Math.min(b.top, window.innerHeight - 100) }); }}>⋮</button>
      {pos && (
        <div className="ctx-menu" role="menu" style={{ left: pos.x, top: pos.y }}>
          {items.map((i) => <button key={i.label} type="button" role="menuitem" onClick={i.run}>{i.label}</button>)}
        </div>
      )}
    </>
  );
}

export function AirlineTable({ rows, total }: { rows: AirlineRow[]; total: number }) {
  const [edit, setEdit] = useState<AirlineRow | null>(null);
  const { post, busy } = usePost();
  const { wrap, sel, menu, setMenu, rowProps, selBox, emptyMenu } = useRowSelection(rows.map((r) => r.id), 130);
  const groupOf = useGroupOf<AirlineRow>({ status: (a) => (a.active ? 'Active' : 'Inactive') });
  const setActive = (ids: number[], active: boolean) => { setMenu(null); post('/api/airlines/bulk-status', { ids: ids.join(','), active: active ? '1' : '0' }); };
  const itemsFor = (ids: number[]): Item[] => {
    const picked = rows.filter((r) => ids.includes(r.id));
    const out: Item[] = [];
    if (picked.length === 1) out.push({ label: 'Edit', run: () => { setMenu(null); setEdit(picked[0]); } });
    const on = picked.filter((r) => r.active), off = picked.filter((r) => !r.active);
    if (on.length) out.push({ label: on.length === 1 ? 'Deactivate' : `Deactivate ${on.length} airlines`, run: () => setActive(on.map((r) => r.id), false) });
    if (off.length) out.push({ label: off.length === 1 ? 'Activate' : `Activate ${off.length} airlines`, run: () => setActive(off.map((r) => r.id), true) });
    return out;
  };
  return (
    <div className="tw tw-fixed tw-fm tw-sel" ref={wrap} onContextMenu={emptyMenu}>
      <table><colgroup><col /><col style={{ width: '14%' }} /><col style={{ width: '18%' }} /><col style={{ width: '18%' }} /><col style={{ width: 70 }} /></colgroup>
        <thead><tr><th>Airline</th><th>Status</th><th style={{ textAlign: 'center' }}>Sales recorded</th><th>Modified by</th><th></th></tr></thead>
        <tbody>
          {groupedRows(rows, groupOf, 5, (a, i) => (
            <tr key={a.id} {...rowProps(i, a.active ? '' : 'off')} title="Double-click to edit"
              onDoubleClick={(e) => { if (!(e.target as Element).closest('a, button, input, select, textarea, label')) setEdit(a); }}>
              <td><strong>{a.name}</strong></td>
              <td><span className={`badge ${a.active ? 'b-ok' : 'b-err'}`}>{a.active ? 'Active' : 'Inactive'}</span></td>
              <td style={{ textAlign: 'center' }}>{a.sales}</td><td className="small"><ModBy r={a} /></td>
              <td className="num nowrap"><RowActions items={[{ label: 'Edit', run: () => setEdit(a) },
                { label: a.active ? 'Deactivate' : 'Activate', run: () => { if (!busy) setActive([a.id], !a.active); } }]} /></td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={5} className="empty">No airlines found. Use the + button to add one.</td></tr>}
          {!!rows.length && <tr className="fill"><td colSpan={5} /></tr>}
        </tbody>
        {!!rows.length && <FootLine cols={5} total={total} selected={rows.filter((r) => sel.has(r.id)).length} />}
      </table>
      {menu && (
        <div className="ctx-menu" role="menu" style={{ left: menu.x, top: menu.y }} onContextMenu={(e) => e.preventDefault()}>
          {!menu.ids.length && <button type="button" role="menuitem" onClick={() => { setMenu(null); window.dispatchEvent(new Event(NEW_AIRLINE_EVT)); }}>Add airline</button>}
          {!menu.ids.length && <SortGroupItems sg={SG} done={() => setMenu(null)} />}
          {itemsFor(menu.ids).map((i) => <button key={i.label} type="button" role="menuitem" onClick={i.run}>{i.label}</button>)}
        </div>
      )}
      {edit && <AirlineForm key={edit.id} a={edit} onClose={() => setEdit(null)} />}
      {selBox}
    </div>
  );
}
