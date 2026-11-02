'use client';
// User Management table (Name, Role, Designation) with file-explorer style row selection (see row-select.tsx).
// Double-click or right-click → Edit opens the user in a dialog; right-click also activates / deactivates the selection,
// and right-click on the empty space below the rows offers "Add user".
// Your own account and the owner's are never deactivated, and only the owner can edit the owner account.
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ROLE_LABELS, type Row } from '@/lib/types';
import { useFlash } from './flash';
import { useRowSelection } from './row-select';
import { FootLine } from './ui';
import { ModBy } from './mod-by';
import { ADD_USER_EVT, EmployeeEditModal } from './employee-edit-modal';
import { SortGroupItems, useGroupOf, type SortGroup } from './sort-group';
import { groupedRows } from './group-rows';

const SG: SortGroup = {
  sorts: [['name', 'Name'], ['role', 'Role'], ['designation', 'Designation']],
  groups: [['role', 'Role'], ['status', 'Status'], ['designation', 'Designation']],
};

export function UserTable({ rows, me, meIsOwner }: { rows: Row[]; me: number; meIsOwner: boolean }) {
  const router = useRouter();
  const { show } = useFlash();
  const { wrap, sel, setSel, menu, setMenu, rowProps, selBox, emptyMenu } = useRowSelection(rows.map((r) => Number(r.id)), 140);
  const [editing, setEditing] = useState<Row | null>(null);
  const groupOf = useGroupOf<Row>({ role: (u) => ROLE_LABELS[u.role] ?? u.role, status: (u) => (u.active ? 'Active' : 'Deactivated'), designation: (u) => u.designation || '—' });
  const canEdit = (r: Row) => r.role !== 'owner' || meIsOwner;
  const canToggle = (r: Row) => r.role !== 'owner' && Number(r.id) !== me;
  const edit = (id: number) => {
    setMenu(null);
    const r = rows.find((x) => Number(x.id) === id);
    if (r && canEdit(r)) setEditing(r); else if (r) show('err', 'Only the owner can edit the owner account.');
  };

  const setActive = async (ids: number[], active: boolean) => {
    setMenu(null);
    const n = ids.length, one = rows.find((r) => Number(r.id) === ids[0]);
    if (!active && !window.confirm(`Deactivate ${n === 1 ? one?.name : `these ${n} users`}? They will be signed out and can no longer log in.`)) return;
    const fd = new FormData(); fd.set('ids', ids.join(',')); fd.set('active', active ? '1' : '0');
    try {
      const res = await fetch('/api/employees/bulk-status', { method: 'POST', body: fd, credentials: 'same-origin' });
      const d = await res.json();
      show(d.ok ? 'ok' : 'err', d.msg || (d.ok ? 'Saved.' : 'Could not save.'));
      if (d.ok) { setSel(new Set()); router.refresh(); }
    } catch { show('err', 'Network error. Please try again.'); }
  };

  const menuRows = menu ? rows.filter((r) => menu.ids.includes(Number(r.id))) : [];
  const toActivate = menuRows.filter((r) => !r.active && canToggle(r)).map((r) => Number(r.id));
  const toDeactivate = menuRows.filter((r) => r.active && canToggle(r)).map((r) => Number(r.id));
  const label = (verb: string, k: number) => (k === 1 ? verb : `${verb} ${k} users`);
  const single = menuRows.length === 1 && canEdit(menuRows[0]) ? menuRows[0] : null;
  return (
    <div className="tw tw-fixed tw-fm tw-sel" ref={wrap} onContextMenu={emptyMenu}>
      <table><thead><tr><th>Name</th><th>Role</th><th>Designation</th><th>Modified by</th></tr></thead><tbody>
        {groupedRows(rows, groupOf, 4, (u, i) => (
          <tr key={u.id} {...rowProps(i, u.active ? '' : 'off')} onDoubleClick={() => edit(Number(u.id))} title={u.active ? undefined : 'Deactivated'}>
            <td>{u.name}{Number(u.id) === me && <span className="muted small"> (you)</span>}{!u.active && <span className="muted small"> — deactivated</span>}</td>
            <td>{ROLE_LABELS[u.role] ?? u.role}</td><td>{u.designation || '—'}</td><td className="small"><ModBy r={u} /></td>
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={4} className="empty">No users match these filters.</td></tr>}
        <tr className="fill"><td colSpan={4} /></tr>
      </tbody>
      {!!rows.length && <FootLine cols={4} total={rows.length} selected={sel.size} />}
      </table>
      {menu && (!menu.ids.length || single || toActivate.length || toDeactivate.length) ? (
        <div className="ctx-menu" role="menu" style={{ left: menu.x, top: menu.y }} onContextMenu={(e) => e.preventDefault()}>
          {!menu.ids.length && <button type="button" role="menuitem" onClick={() => { setMenu(null); window.dispatchEvent(new Event(ADD_USER_EVT)); }}>Add user</button>}
          {!menu.ids.length && <SortGroupItems sg={SG} done={() => setMenu(null)} />}
          {single && <button type="button" role="menuitem" onClick={() => edit(Number(single.id))}>Edit</button>}
          {!!toActivate.length && <button type="button" role="menuitem" onClick={() => setActive(toActivate, true)}>{label('Activate', toActivate.length)}</button>}
          {!!toDeactivate.length && <button type="button" role="menuitem" className="danger" onClick={() => setActive(toDeactivate, false)}>{label('Deactivate', toDeactivate.length)}</button>}
        </div>
      ) : null}
      {editing && <EmployeeEditModal key={editing.id} user={editing} onClose={() => setEditing(null)} />}
      {selBox}
    </div>
  );
}
