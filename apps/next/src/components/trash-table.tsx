'use client';
// Trash (staff) and Delete Archive (owner / admin) list. Rows can be selected like in the other tables (click, Ctrl/Shift+click, drag a
// box) and right-clicked. Staff can restore records or remove them from their Trash for good; the owner / admin can only restore
// (nothing is ever erased: "delete permanently" just hides the record from the staff member's own Trash).
import { dt12 } from '@/lib/util';
import { askConfirm } from './confirm';
import { FootLine } from './foot-line';
import { KebabMenu } from './kebab-menu';
import { usePost } from './modal';
import { useRowSelection } from './row-select';

export interface TrashRow {
  id: number; type: string; label: string; detail: string; amount: number | null; deleted_at: string;
  by?: string; status: string; tone: '' | 'b-ok' | 'b-warn' | 'b-err' | 'b-info'; sub?: string;
}

export function TrashTable({ rows, total, owner }: { rows: TrashRow[]; total: number; owner: boolean }) {
  const { post, busy } = usePost();
  const { wrap, sel, setSel, menu, setMenu, rowProps, selBox, emptyMenu } = useRowSelection(rows.map((r) => r.id), 90);
  const name = (picked: TrashRow[]) => (picked.length === 1 ? `"${picked[0].label}"` : `these ${picked.length} records`);
  const send = async (ids: number[], action: 'restore' | 'purge') => {
    setMenu(null);
    const picked = rows.filter((r) => ids.includes(r.id));
    const ok = action === 'restore'
      ? await askConfirm({ title: 'Restore', confirmLabel: 'Restore', message: `Restore ${name(picked)}? ${picked.length === 1 ? 'It goes' : 'They go'} back to ${picked.length === 1 ? 'its' : 'their'} list.` })
      : await askConfirm({ title: 'Delete permanently', danger: true, confirmLabel: 'Delete permanently',
        message: `Remove ${name(picked)} from your trash? You will not be able to retrieve ${picked.length === 1 ? 'it' : 'them'} yourself afterwards. The owner keeps a copy in the Delete Archive.` });
    if (!ok) return;
    const d = await post('/api/trash/bulk', { ids: ids.join(','), action });
    if (d.ok) setSel(new Set());
  };
  const items = (ids: number[]) => {
    const n = ids.length;
    const out: { label: string; run: () => void; danger?: boolean }[] = [{ label: n === 1 ? 'Restore' : `Restore ${n} records`, run: () => send(ids, 'restore') }];
    if (!owner) out.push({ label: n === 1 ? 'Delete permanently' : `Delete ${n} records permanently`, danger: true, run: () => send(ids, 'purge') });
    return out;
  };
  const cols = owner ? 6 : 5;
  // Column widths add up to 100% so the table always fills its card (no empty strip on the right).
  const w = owner ? ['10%', '28%', '16%', '15%', '19%', '12%'] : ['14%', '44%', '18%', '18%', '6%'];
  return (
    <div className="tw tw-fixed tw-fm tw-sel" ref={wrap} onContextMenu={emptyMenu}>
      <table>
        <colgroup>{w.map((x, i) => <col key={i} style={{ width: x }} />)}</colgroup>
        <thead><tr><th>Type</th><th>Record</th>{owner && <th>Deleted by</th>}<th>Deleted on</th><th>{owner ? 'Status' : 'Time left'}</th><th></th></tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id} {...rowProps(i)}>
              <td className="nowrap">{r.type}</td>
              <td><strong>{r.label}</strong><div className="small muted" style={{ overflowWrap: 'anywhere' }}>{r.detail}</div></td>
              {owner && <td>{r.by}</td>}
              <td className="nowrap small">{dt12(r.deleted_at)}</td>
              <td><span className={`badge ${r.tone}`} style={{ whiteSpace: 'normal' }}>{r.status}</span>{r.sub && <div className="small muted">{r.sub}</div>}</td>
              <td className="nowrap" style={{ textAlign: 'right' }}>
                {owner
                  ? <button type="button" className="btn sm" disabled={busy} onClick={() => send([r.id], 'restore')}>Restore</button>
                  : <KebabMenu label={`Actions for ${r.label}`} items={items([r.id]).map((i) => ({ label: i.label, danger: i.danger, disabled: busy, onClick: i.run }))} />}
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={cols} className="empty"><strong>{owner ? 'Nothing has been deleted yet.' : 'Your trash is empty.'}</strong><br />
            <span className="small muted">{owner ? 'Records that staff, admins or the owner delete are kept here and can be restored.' : 'Records you delete stay here for 30 days, so you can still retrieve them.'}</span></td></tr>}
          {!!rows.length && <tr className="fill"><td colSpan={cols} /></tr>}
        </tbody>
        {!!rows.length && <FootLine cols={cols} total={total} selected={rows.filter((r) => sel.has(r.id)).length} />}
      </table>
      {menu && menu.ids.length > 0 && (
        <div className="ctx-menu" role="menu" style={{ left: menu.x, top: menu.y }} onContextMenu={(e) => e.preventDefault()}>
          {items(menu.ids).map((i) => <button key={i.label} type="button" role="menuitem" className={i.danger ? 'danger' : undefined} disabled={busy} onClick={i.run}>{i.label}</button>)}
        </div>
      )}
      {selBox}
    </div>
  );
}
