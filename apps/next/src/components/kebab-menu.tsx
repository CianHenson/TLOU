'use client';
// Three-dot (⋯) action button for table rows: opens a small menu of actions under the button. The menu is rendered in place
// (not in a portal) so it also works inside <dialog> modals, and uses `position: fixed` so scrolling tables never clip it.
import { useEffect, useRef, useState } from 'react';

export type KebabItem = { label: string; onClick: () => void; danger?: boolean; disabled?: boolean };

export function KebabMenu({ items, label = 'Actions' }: { items: KebabItem[]; label?: string }) {
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!pos) return;
    const close = (e: Event) => { if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setPos(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setPos(null); } };
    const scroll = () => setPos(null);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc, true);
    window.addEventListener('scroll', scroll, true);
    window.addEventListener('resize', scroll);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc, true); window.removeEventListener('scroll', scroll, true); window.removeEventListener('resize', scroll); };
  }, [pos]);

  const toggle = () => {
    if (pos) { setPos(null); return; }
    const r = btn.current!.getBoundingClientRect(), h = items.length * 38 + 16;
    setPos({ left: Math.max(8, Math.min(r.right - 170, window.innerWidth - 178)), top: r.bottom + h > window.innerHeight - 8 ? Math.max(8, r.top - h - 4) : r.bottom + 4 });
  };

  return (
    <>
      <button ref={btn} type="button" className="kebab" aria-label={label} title={label} aria-haspopup="menu" aria-expanded={!!pos} onClick={toggle}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.8" /><circle cx="12" cy="12" r="1.8" /><circle cx="12" cy="19" r="1.8" /></svg>
      </button>
      {pos && (
        <div ref={menu} className="ctx-menu" role="menu" style={{ left: pos.left, top: pos.top }} onContextMenu={(e) => e.preventDefault()}>
          {items.map((a) => (
            <button key={a.label} type="button" role="menuitem" className={a.danger ? 'danger' : undefined} disabled={a.disabled} onClick={() => { setPos(null); a.onClick(); }}>{a.label}</button>
          ))}
        </div>
      )}
    </>
  );
}
