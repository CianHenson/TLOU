'use client';
// Keeps every right-click menu (.ctx-menu, all the tables) fully inside the window: after a menu is shown or moved it is measured
// and pulled back from the right / bottom edge. Mounted once in the app layout, so each table's own click-position math can stay simple.
import { useEffect } from 'react';

const GAP = 8;

function fit(el: HTMLElement) {
  const r = el.getBoundingClientRect();
  const left = parseFloat(el.style.left) || r.left, top = parseFloat(el.style.top) || r.top;
  const nl = Math.max(GAP, Math.min(left, window.innerWidth - r.width - GAP));
  const nt = Math.max(GAP, Math.min(top, window.innerHeight - r.height - GAP));
  if (Math.abs(nl - left) > 0.5) el.style.left = `${nl}px`;
  if (Math.abs(nt - top) > 0.5) el.style.top = `${nt}px`;
}

export function ContextMenuFit() {
  useEffect(() => {
    const run = () => document.querySelectorAll<HTMLElement>('.ctx-menu').forEach(fit);
    const mo = new MutationObserver(run);
    mo.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
    window.addEventListener('resize', run);
    return () => { mo.disconnect(); window.removeEventListener('resize', run); };
  }, []);
  return null;
}
