'use client';
// One-line table footer used by every list table: the record count on the left ("All records: N", or "Selected records:
// n/N" when rows are selected) and an optional summary on the right. It stays put when a wide table scrolls sideways: the
// line is as wide as the visible table area (--tw-w) and sticks to its left edge (--tw-l), so the totals never scroll away.
import { useEffect, useRef, type ReactNode } from 'react';

export function FootLine({ cols, total, selected = 0, right }: { cols: number; total: number; selected?: number; right?: ReactNode }) {
  const line = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = line.current, tw = el?.closest<HTMLElement>('.tw'), td = el?.parentElement;
    if (!el || !tw || !td) return;
    const fit = () => {
      const cs = getComputedStyle(td), l = parseFloat(cs.paddingLeft) || 0, r = parseFloat(cs.paddingRight) || 0;
      el.style.setProperty('--tw-l', `${l}px`);
      el.style.setProperty('--tw-w', `${Math.max(0, tw.clientWidth - l - r)}px`);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(tw);
    return () => ro.disconnect();
  }, []);
  return (
    <tfoot><tr className={selected ? 'sel-total' : undefined}><td colSpan={cols}><div className="foot-line" ref={line}>
      <span>{selected ? `Selected records: ${selected}/${total}` : `All records: ${total}`}</span>
      {right != null && right !== false && <span>{right}</span>}
    </div></td></tr></tfoot>
  );
}
