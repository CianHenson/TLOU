'use client';
// Month + year picker for the module header (My Attendance). Same button / popover look as the date menu, but it only picks
// a month: arrows change the year, a 12-month grid picks the month, and the page applies it at once (query key `month`).
import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

/** `value` / `max` are 'YYYY-MM'; months after `max` cannot be picked. */
export function MonthPicker({ value, max }: { value: string; max: string }) {
  const router = useRouter(), path = usePathname(), sp = useSearchParams();
  const [open, setOpen] = useState(false);
  const [year, setYear] = useState(Number(value.slice(0, 4)));
  const box = useRef<HTMLDivElement>(null);
  const maxY = Number(max.slice(0, 4));

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => { if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  const label = new Date(`${value}-01T00:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' });
  const pick = (i: number) => {
    const ym = `${year}-${String(i + 1).padStart(2, '0')}`;
    const qs = new URLSearchParams(sp.toString());
    qs.set('month', ym);
    for (const k of ['from', 'to', 'range', 'hl', 'page']) qs.delete(k);
    setOpen(false);
    router.replace(`${path}?${qs}`, { scroll: false });
  };
  return (
    <div className="af-date" ref={box}>
      <button type="button" className="af-date-btn set" onClick={() => { setYear(Number(value.slice(0, 4))); setOpen(!open); }} aria-haspopup="dialog" aria-expanded={open}>
        <Icon d="M3 5h18v16H3zM3 10h18M8 3v4M16 3v4" /><span>{label}</span><Icon d="M6 9l6 6 6-6" />
      </button>
      {open && (
        <div className="af-menu mp" role="dialog" aria-label="Choose month and year">
          <div className="mp-year">
            <button type="button" aria-label="Previous year" onClick={() => setYear(year - 1)}>‹</button>
            <b>{year}</b>
            <button type="button" aria-label="Next year" disabled={year >= maxY} onClick={() => setYear(year + 1)}>›</button>
          </div>
          <div className="mp-grid">
            {MONTHS.map((m, i) => {
              const ym = `${year}-${String(i + 1).padStart(2, '0')}`;
              return <button key={m} type="button" className={ym === value ? 'on' : ''} disabled={ym > max} onClick={() => pick(i)}>{m}</button>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
