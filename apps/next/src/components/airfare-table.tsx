'use client';
// Airfare Sales table with file-explorer style row selection (see row-select.tsx). The footer line shows the record count
// and total amount / agency income (cancelled sales excluded), for the selection while rows are selected; right-click edits one sale
// or, for the owner, deletes the selection.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { peso } from '@/lib/util';
import type { Row } from '@/lib/types';
import { useFlash } from './flash';
import { FootLine } from './ui';
import { useRowSelection } from './row-select';
import { NEW_SALE_EVT } from './new-sale-button';

const CLS: Record<string, string> = { Pending: 'b-warn', Done: 'b-ok', Rebooked: 'b-info', 'No-show': 'b-err', Cancelled: 'b-err' };

/** Small fixed-position popover opened from a table cell, so wide details (contact, fees) don't need extra columns. */
function Peek({ label, children, panel }: { label: ReactNode; children?: never; panel: ReactNode }) {
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null), pop = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pos) return;
    const out = (e: Event) => { if (!btn.current?.contains(e.target as Node) && !pop.current?.contains(e.target as Node)) setPos(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setPos(null); btn.current?.focus(); } };
    const away = (e: Event) => { if (!pop.current?.contains(e.target as Node)) setPos(null); };
    document.addEventListener('mousedown', out); document.addEventListener('keydown', esc);
    window.addEventListener('scroll', away, true); window.addEventListener('resize', away);
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc); window.removeEventListener('scroll', away, true); window.removeEventListener('resize', away); };
  }, [pos]);
  const toggle = () => {
    if (pos) return setPos(null);
    const r = btn.current!.getBoundingClientRect(), below = window.innerHeight - r.bottom > 200;
    setPos({ left: Math.max(8, Math.min(r.left, window.innerWidth - 276)), ...(below ? { top: r.bottom + 4 } : { bottom: window.innerHeight - r.top + 4 }) });
  };
  return (
    <>
      <button ref={btn} type="button" className="peek-btn" aria-haspopup="dialog" aria-expanded={!!pos} onClick={toggle}>
        {label}<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {pos && <div ref={pop} className="peek-pop" role="dialog" style={pos}>{panel}</div>}
    </>
  );
}

const Line = ({ k, v, c }: { k: string; v: ReactNode; c?: string }) => <div className="peek-line"><span>{k}</span><strong style={c ? { color: c } : undefined}>{v}</strong></div>;

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
    <div className="tw tw-fixed tw-fm tw-sel af-tw" ref={wrap} onContextMenu={emptyMenu}>
      <table><thead><tr>
        <th>Transaction date</th><th>Airline</th><th>PNR</th><th className="num">PAX</th><th>Passenger</th><th>Contact</th><th>Route</th>
        <th>Travel</th><th>Check-in</th><th>Flight no.</th><th className="num">Total amount</th></tr></thead><tbody>
        {rows.map((r, i) => (
          <tr key={r.id} {...rowProps(i, r.checkin_status === 'Cancelled' ? 'off' : '')} title="Double-click to edit"
            onDoubleClick={(e) => { if (!(e.target as Element).closest('a, button, input, select, textarea, label, [role=dialog]')) router.push(`/app/airfare/${r.id}`); }}>
            <td className="nowrap">{r.txn_date}</td><td className="nowrap">{r.airline}</td><td><strong>{r.pnr}</strong></td><td className="num">{r.pax}</td><td>{r.passenger}</td>
            <td>{r.contact || r.email_fb || r.remarks
              ? <Peek label={r.contact || 'Details'} panel={<>
                  <Line k="Contact number" v={r.contact || '—'} /><Line k="Email / Facebook" v={r.email_fb || '—'} />
                  {r.remarks && <Line k="Remarks" v={r.remarks} />}</>} />
              : '—'}</td>
            <td>{r.origin} → {r.destination}</td><td className="nowrap">{r.travel_date}{r.travel_time ? <div className="small">{r.travel_time}</div> : null}</td>
            <td><span className={`badge ${CLS[r.checkin_status] ?? ''}`}>{r.checkin_status}</span></td><td className="nowrap">{r.flight_no}</td>
            <td className="num"><Peek label={peso(r.total_amount)} panel={<>
              <Line k="Total amount" v={peso(r.total_amount)} /><Line k="Service charge" v={peso(r.service_charge)} />
              <Line k="Card fee" v={r.card_fee ? `(${peso(r.card_fee)})` : '—'} c={r.card_fee ? 'var(--err)' : undefined} />
              <Line k="Agency income" v={peso(Number(r.service_charge || 0) - Number(r.card_fee || 0))} /></>} /></td>
          </tr>
        ))}
        {!rows.length && <tr><td colSpan={11} className="empty"><span className="empty-msg">No airfare sales recorded.</span></td></tr>}
        {/* Filler row stretches to the bottom so the footer below always sits at the bottom of the table area. */}
        {!!rows.length && <tr className="fill"><td colSpan={11} /></tr>}
      </tbody>
      {/* Totals leave out cancelled sales (as everywhere else); `totals` covers every filtered sale, not just this page. */}
      <FootLine cols={11} total={totals.n_all} selected={picked.length} right={picked.length
        ? `${skipped ? `${skipped} cancelled not counted · ` : ''}Total amount: ${peso(sum('total_amount'))} · Agency income: ${peso(sum('service_charge') - sum('card_fee'))}`
        : `Total amount: ${peso(totals.total)} · Agency income: ${peso(totals.sc - totals.fee)}`} />
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
