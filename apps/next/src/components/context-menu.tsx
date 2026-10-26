'use client';
// Right-click menus for server-rendered list tables (Customers, Travel Requests, Bookings, Payments, Expenses). Each
// <tr> lists its own actions in a `data-menu` attribute (JSON from rowMenu() in lib/menu.ts); right-clicking the row shows them, and
// double-clicking runs the first link. Right-clicking the table's empty space shows `empty` (e.g. "New customer").
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { MenuAction } from '@/lib/menu';
import { ApiForm, Field, Submit } from './form';
import { Modal } from './modal';

export function RowMenus({ empty = [], children, className = 'tw' }: { empty?: MenuAction[]; children: ReactNode; className?: string }) {
  const router = useRouter();
  const [menu, setMenu] = useState<{ x: number; y: number; items: MenuAction[] } | null>(null);
  const [asking, setAsking] = useState<Extract<MenuAction, { reason: string }> | null>(null);
  const box = useRef<HTMLDivElement>(null);

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

  const itemsFor = (t: Element): MenuAction[] | null => {
    if (t.closest('thead, tfoot')) return null;
    const tr = t.closest<HTMLElement>('tr[data-menu]');
    if (tr) { try { return JSON.parse(tr.dataset.menu!) as MenuAction[]; } catch { return null; } }
    return t.closest('tr:not(.fill)') && !t.closest('td.empty') ? null : empty;
  };
  const onContext = (e: React.MouseEvent) => {
    const t = e.target as Element;
    if (t.closest('a, button, input, select, textarea, label')) return; // keep the browser menu on links and controls
    const items = itemsFor(t);
    if (!items?.length) return;
    e.preventDefault();
    setMenu({ x: Math.min(e.clientX, window.innerWidth - 220), y: Math.min(e.clientY, window.innerHeight - items.length * 38 - 16), items });
  };
  const onDouble = (e: React.MouseEvent) => {
    const t = e.target as Element;
    if (t.closest('a, button, input, select, textarea, label')) return;
    const first = t.closest('tr[data-menu]') ? itemsFor(t)?.find((a) => 'href' in a) : undefined;
    if (first && 'href' in first) router.push(first.href);
  };
  const run = (a: MenuAction) => {
    setMenu(null);
    if ('href' in a) router.push(a.href);
    else if ('event' in a) window.dispatchEvent(new CustomEvent(a.event, { detail: a.detail }));
    else setAsking(a);
  };
  return (
    <div className={className} ref={box} onContextMenu={onContext} onDoubleClick={onDouble}>
      {children}
      {menu && (
        <div className="ctx-menu" role="menu" style={{ left: menu.x, top: menu.y }} onContextMenu={(e) => e.preventDefault()}>
          {menu.items.map((a) => (
            <button key={a.label} type="button" role="menuitem" className={'danger' in a && a.danger ? 'danger' : undefined} onClick={() => run(a)}>{a.label}</button>
          ))}
        </div>
      )}
      {asking && (
        <Modal title={asking.title} onClose={() => setAsking(null)} width={520}>
          {(close) => (
            <ApiForm action={asking.reason} stay onDone={(d) => { if (d.ok) close(); }}>
              <Field name={asking.field ?? 'reason'} label="Reason *" type="textarea" attrs={{ required: true, maxLength: 500, rows: 3 }} />
              <div className="row"><Submit className={asking.danger ? 'btn danger' : 'btn'}>{asking.label}</Submit> <button type="button" className="btn ghost" onClick={close}>Cancel</button></div>
            </ApiForm>
          )}
        </Modal>
      )}
    </div>
  );
}
