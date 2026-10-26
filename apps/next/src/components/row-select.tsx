'use client';
// File-explorer style row selection for list tables (Monitoring Finances, Airfare Sales): click selects one, Ctrl/Cmd+click
// toggles, Shift+click selects a range, and dragging from empty space draws a box that selects the rows it touches (from
// inside the table or from the empty page around it; hold Ctrl/Cmd or Shift to add to the current selection). Esc or a
// click on empty space clears. Right-click opens a context menu for the row, or for the whole selection if the row is in it.
// Rows must carry `data-id`; the table wrapper takes `wrap` as its ref and the `tw-sel` class.
import { useEffect, useRef, useState } from 'react';

/** Clicks on these inside a row are left to the control and do not change the selection. */
const CONTROLS = 'a, button, input, select, textarea, label, form';

export function useRowSelection(ids: number[], menuHeight = 110) {
  const [sel, setSel] = useState<Set<number>>(new Set());
  const [box, setBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; ids: number[] } | null>(null);
  const anchor = useRef<number | null>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const key = ids.join(',');

  // Drop selections that the filters have since removed from the list.
  useEffect(() => { setSel((s) => new Set([...s].filter((id) => ids.includes(id)))); }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setSel(new Set()); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, []);

  const clickRow = (e: React.MouseEvent, i: number) => {
    if ((e.target as Element).closest(CONTROLS)) return;
    const id = ids[i];
    if (e.shiftKey && anchor.current !== null) {
      const [a, b] = [Math.min(anchor.current, i), Math.max(anchor.current, i)];
      const range = ids.slice(a, b + 1);
      setSel(e.ctrlKey || e.metaKey ? new Set([...sel, ...range]) : new Set(range));
    } else if (e.ctrlKey || e.metaKey) {
      const n = new Set(sel);
      if (n.has(id)) n.delete(id); else n.add(id);
      setSel(n); anchor.current = i;
    } else { setSel(new Set([id])); anchor.current = i; }
  };

  const selRef = useRef(sel);
  selRef.current = sel;
  // Rubber-band selection: can start anywhere that isn't an interactive element or a row (the page background around the
  // table counts), is tracked on the window, and only selects rows inside the table's visible area. Near the top / bottom
  // edge of the table it auto-scrolls.
  useEffect(() => {
    const down = (e: MouseEvent) => {
      const area = wrap.current;
      const t = e.target as Element;
      if (!area || e.button !== 0 || t.closest('tr:not(.fill), thead, tfoot, a, button, input, select, textarea, label, dialog, aside, .dd-list, .ctx-menu, [role=listbox], [role=dialog], [role=menu]')) return;
      if (area.contains(t) && e.clientX > area.getBoundingClientRect().left + area.clientWidth) return; // the scrollbar
      e.preventDefault();
      const add = e.ctrlKey || e.metaKey || e.shiftKey;
      const base = add ? new Set(selRef.current) : new Set<number>();
      const x0 = e.clientX, y0 = e.clientY;
      let mx = x0, my = y0, moved = false, timer: ReturnType<typeof setInterval> | undefined;
      const update = () => {
        const b = { x: Math.min(x0, mx), y: Math.min(y0, my), w: Math.abs(mx - x0), h: Math.abs(my - y0) };
        setBox(b);
        const view = area.getBoundingClientRect();
        const top = Math.max(view.top, area.querySelector('thead')?.getBoundingClientRect().bottom ?? view.top);
        const bottom = Math.min(view.bottom, area.querySelector('tfoot')?.getBoundingClientRect().top ?? view.bottom);
        const hit = new Set(base);
        area.querySelectorAll<HTMLElement>('tbody tr[data-id]').forEach((tr) => {
          const q = tr.getBoundingClientRect();
          const vTop = Math.max(q.top, top), vBottom = Math.min(q.bottom, bottom);
          if (vBottom > vTop && q.right > b.x && q.left < b.x + b.w && vBottom > b.y && vTop < b.y + b.h) hit.add(Number(tr.dataset.id));
        });
        setSel(hit);
      };
      const move = (m: MouseEvent) => {
        mx = m.clientX; my = m.clientY;
        if (!moved && Math.hypot(mx - x0, my - y0) < 4) return;
        moved = true;
        update();
        timer ??= setInterval(() => {
          const v = area.getBoundingClientRect();
          const dy = my < v.top + 40 ? -14 : my > v.bottom - 40 ? 14 : 0;
          if (dy) { area.scrollTop += dy; update(); }
        }, 30);
      };
      const up = () => {
        window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up);
        clearInterval(timer);
        setBox(null);
        if (!moved && !add) setSel(new Set()); // plain click on empty space clears
      };
      window.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    };
    document.addEventListener('mousedown', down);
    return () => document.removeEventListener('mousedown', down);
  }, []);

  // Right-click: on an unselected row it selects that row first; on a selected one it acts on the whole selection.
  const contextRow = (e: React.MouseEvent, i: number) => {
    if ((e.target as Element).closest(CONTROLS)) return;
    e.preventDefault();
    const id = ids[i];
    let picked = [...sel];
    if (!sel.has(id)) { picked = [id]; setSel(new Set(picked)); anchor.current = i; }
    setMenu({ x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - menuHeight), ids: picked });
  };
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

  /**
   * For the table wrapper's onContextMenu: right-click on empty space (not a row or the header) clears the selection and
   * opens the menu with no ids, which tables use for their "add" action (New sale, Add user, …).
   */
  const emptyMenu = (e: React.MouseEvent) => {
    if ((e.target as Element).closest('tr[data-id], thead, tfoot, a, button, input, select, textarea, label')) return;
    e.preventDefault();
    setSel(new Set());
    setMenu({ x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 60), ids: [] });
  };

  /** Props for a selectable <tr>; `cls` is the row's own class (kept alongside `sel`). */
  const rowProps = (i: number, cls = '') => ({
    'data-id': ids[i], className: [cls, sel.has(ids[i]) && 'sel'].filter(Boolean).join(' ') || undefined, 'aria-selected': sel.has(ids[i]),
    onClick: (e: React.MouseEvent) => clickRow(e, i), onContextMenu: (e: React.MouseEvent) => contextRow(e, i),
  });
  const selBox = box && <div className="sel-box" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />;
  return { wrap, sel, setSel, menu, setMenu, rowProps, selBox, emptyMenu };
}
