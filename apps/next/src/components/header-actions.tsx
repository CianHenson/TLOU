'use client';
// Filters and action buttons of the module header (Page in ui.tsx). On wide screens they sit in the header as before (the wrappers use
// `display: contents`). On phones, when there are several (more than one action, or filters together with an action) they fold into a
// three-dot (⋯) button that opens them all as one panel; otherwise they stay where they are. Only CSS decides what is shown (see "Phones:
// header filters + actions" in shell.css; `:has(...)` means "there is more than one", so nothing flashes before the page loads), so the
// controls and the dialogs they open keep working exactly as before.
import { useEffect, useRef, useState, type ReactNode } from 'react';

export function HeaderActions({ filters, children }: { filters?: ReactNode; children?: ReactNode }) {
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false); // the date menu inside the panel is open: the action buttons step aside

  useEffect(() => {
    if (!open) return;
    const out = (e: Event) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', out);
    document.addEventListener('keydown', esc);
    // The date menu inside the panel closes itself once a range is chosen: close the whole panel with it.
    let hadMenu = false;
    const mo = new MutationObserver(() => {
      const has = !!panel.current?.querySelector('.af-menu');
      if (hadMenu && !has) setOpen(false);
      hadMenu = has;
      setDateOpen(has);
    });
    if (panel.current) mo.observe(panel.current, { childList: true, subtree: true });
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc); mo.disconnect(); setDateOpen(false); };
  }, [open]);

  return (
    <div ref={box} className={`mh-right${open ? ' open' : ''}${dateOpen ? ' date-open' : ''}`}>
      <button type="button" className="mh-more" aria-label="Filters and actions" aria-haspopup="true" aria-expanded={open} onClick={() => setOpen(!open)}>
        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor" aria-hidden="true"><circle cx="12" cy="5" r="1.9" /><circle cx="12" cy="12" r="1.9" /><circle cx="12" cy="19" r="1.9" /></svg>
      </button>
      <div ref={panel} className="mh-panel">
        {filters && <div className="mh-tools">{filters}</div>}
        {children && (
          // Picking an action closes the panel; the dialogs it opens are portalled elsewhere, so hiding the panel does not close them.
          <div className="mh-actions noprint">
            <div className="row mh-actions-list" onClick={(e) => { if ((e.target as Element).closest('button, a')) setTimeout(() => setOpen(false), 0); }}>{children}</div>
          </div>
        )}
      </div>
    </div>
  );
}
