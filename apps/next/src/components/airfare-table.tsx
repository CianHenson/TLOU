'use client';
// Airfare Sales table with file-explorer style row selection (see row-select.tsx). The footer line shows the record count
// and total amount / agency income (cancelled sales excluded), for the selection while rows are selected; right-click edits one sale
// or, for the owner, deletes the selection.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { peso } from '@/lib/util';
import type { Row } from '@/lib/types';
import { useFlash } from './flash';
import { FootLine } from './ui';
import { useRowSelection } from './row-select';
import { NEW_SALE_EVT } from './new-sale-button';

const CLS: Record<string, string> = { Pending: 'b-warn', Done: 'b-ok', Rebooked: 'b-info', 'No-show': 'b-err', Cancelled: 'b-err' };

export function AirfareTable({ rows, owner, totals }: { rows: Row[]; owner: boolean; totals: { n_all: number; total: number; sc: number; fee: number } }) {
  const router = useRouter();
  const { show } = useFlash();
  const { wrap, sel, setSel, menu, setMenu, rowProps, selBox, emptyMenu } = useRowSelection(rows.map((r) => Number(r.id)));

  const remove = async (ids: number[]) => {
    setMenu(null);
    const n = ids.length, one = rows.find((r) => Number(r.id) === ids[0]);
    if (!window.confirm(n === 1 ? `Delete the sale for ${one?.passenger} (PNR ${one?.pnr})?` : `Delete these ${n} airfare sales?`)) return;
    const fd = new FormData(); fd.set('ids', ids.join(','));
    try {
      const res = await fetch('/api/airfare/bulk-delete', { method: 'POST', body: fd, credentials: 'same-origin' });
      const d = await res.json();
      show(d.ok ? 'ok' : 'err', d.msg || (d.ok ? 'Deleted.' : 'Could not delete.'));
      if (d.ok) { setSel(new Set()); router.refresh(); }
    } catch { show('err', 'Network error. Please try again.'); }
  };

  const picked = rows.filter((r) => sel.has(Number(r.id)));
  const counted = picked.filter((r) => r.checkin_status !== 'Cancelled');
  const sum = (k: string) => counted.reduce((s, r) => s + Number(r[k] || 0), 0);
  const skipped = picked.length - counted.length;
  return (
    <div className="tw tw-fixed tw-sel" ref={wrap} onContextMenu={emptyMenu}>
      <table><thead><tr>
        <th>Transaction date</th><th>Airline</th><th>PNR</th><th className="num">PAX</th><th>Passenger</th><th>Contact number</th><th>Email / Facebook</th><th>Origin</th><th>Destination</th>
        <th>Travel date</th><th>Time</th><th>Check-in</th><th>Airline ID / flight no.</th><th className="num">Total amount</th><th className="num">Service charge</th>
        <th className="num">Card fee</th><th>Remarks</th><th></th></tr></thead><tbody>
        {rows.map((r, i) => (
          <tr key={r.id} {...rowProps(i, r.checkin_status === 'Cancelled' ? 'off' : '')}>
            <td className="nowrap">{r.txn_date}</td><td className="nowrap">{r.airline}</td><td><strong>{r.pnr}</strong></td><td className="num">{r.pax}</td><td>{r.passenger}</td>
            <td className="nowrap">{r.contact}</td><td>{r.email_fb}</td><td>{r.origin}</td><td>{r.destination}</td><td className="nowrap">{r.travel_date}</td><td>{r.travel_time}</td>
            <td><span className={`badge ${CLS[r.checkin_status] ?? ''}`}>{r.checkin_status}</span></td><td>{r.flight_no}</td><td className="num">{peso(r.total_amount)}</td>
            <td className="num">{peso(r.service_charge)}</td><td className="num" style={{ color: r.card_fee ? 'var(--err)' : undefined }}>{r.card_fee ? `(${peso(r.card_fee)})` : '—'}</td>
            <td className="small">{r.remarks}</td>
            <td className="nowrap"><Link href={`/app/airfare/${r.id}`}>Edit</Link>
              {owner && <button type="button" className="btn danger sm" style={{ marginLeft: 8 }} onClick={() => remove([Number(r.id)])}>Delete</button>}</td>
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={18} className="empty"><span className="empty-msg">No airfare sales recorded.</span></td></tr>}
      </tbody>
      {/* Totals leave out cancelled sales (as everywhere else); `totals` covers every filtered sale, not just this page. */}
      {!!rows.length && <FootLine cols={18} total={totals.n_all} selected={picked.length} right={picked.length
        ? `${skipped ? `${skipped} cancelled not counted · ` : ''}Total amount: ${peso(sum('total_amount'))} · Agency income: ${peso(sum('service_charge') - sum('card_fee'))}`
        : `Total amount: ${peso(totals.total)} · Agency income: ${peso(totals.sc - totals.fee)}`} />}
      </table>
      {menu && (
        <div className="ctx-menu" role="menu" style={{ left: menu.x, top: menu.y }} onContextMenu={(e) => e.preventDefault()}>
          {!menu.ids.length && <button type="button" role="menuitem" onClick={() => { setMenu(null); window.dispatchEvent(new Event(NEW_SALE_EVT)); }}>New sale</button>}
          {menu.ids.length === 1 && <button type="button" role="menuitem" onClick={() => { setMenu(null); router.push(`/app/airfare/${menu.ids[0]}`); }}>Edit</button>}
          {owner && !!menu.ids.length && <button type="button" role="menuitem" className="danger" onClick={() => remove(menu.ids)}>{menu.ids.length === 1 ? 'Delete' : `Delete ${menu.ids.length} sales`}</button>}
          {!owner && menu.ids.length > 1 && <button type="button" role="menuitem" onClick={() => setMenu(null)}>{menu.ids.length} sales selected</button>}
        </div>
      )}
      {selBox}
    </div>
  );
}
