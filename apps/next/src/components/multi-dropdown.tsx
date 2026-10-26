'use client';
// Multi-select sibling of Dropdown: same button / floating list look, but each option has a checkbox and the list stays
// open while ticking. `value` is the ticked options joined by commas ('' = none, i.e. "all"); `allLabel` clears them.
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';

export function MultiDropdown({ options, value, onChange, ariaLabel, allLabel, noun }: {
  options: string[]; value: string; onChange: (v: string) => void; ariaLabel: string; allLabel: string; noun: string;
}) {
  const sel = value ? value.split(',').filter((v) => options.includes(v)) : [];
  const [pos, setPos] = useState<CSSProperties | null>(null);
  const btn = useRef<HTMLButtonElement>(null), list = useRef<HTMLUListElement>(null);
  const id = useId();
  const open = () => {
    const r = btn.current!.getBoundingClientRect();
    const h = Math.min((options.length + 1) * 38 + 12, 300), below = window.innerHeight - r.bottom > h + 12;
    setPos({ left: r.left, minWidth: r.width, ...(below ? { top: r.bottom + 6 } : { bottom: window.innerHeight - r.top + 6 }) });
  };
  const close = (focus = true) => { setPos(null); if (focus) btn.current?.focus(); };
  const toggle = (o: string) => onChange(options.filter((x) => (x === o ? !sel.includes(x) : sel.includes(x))).join(','));

  useEffect(() => {
    if (!pos) return;
    const out = (e: Event) => { if (!btn.current?.contains(e.target as Node) && !list.current?.contains(e.target as Node)) close(false); };
    const away = (e: Event) => { if (!list.current?.contains(e.target as Node)) close(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', out);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', away, true);
    window.addEventListener('resize', away);
    return () => { document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc); window.removeEventListener('scroll', away, true); window.removeEventListener('resize', away); };
  }, [pos]); // eslint-disable-line react-hooks/exhaustive-deps

  const label = !sel.length ? allLabel : sel.length === 1 ? sel[0] : `${sel.length} ${noun} selected`;
  return (
    <span className="dd">
      <button ref={btn} type="button" className="dd-btn" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={!!pos}
        aria-controls={pos ? id : undefined} onClick={() => (pos ? close() : open())}>
        <span>{label}</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {pos && (
        <ul ref={list} id={id} className="dd-list dd-multi" role="listbox" aria-multiselectable="true" aria-label={ariaLabel} style={pos}>
          <li><label><input type="checkbox" checked={!sel.length} onChange={() => onChange('')} />{allLabel}</label></li>
          {options.map((o) => (
            <li key={o}><label><input type="checkbox" checked={sel.includes(o)} onChange={() => toggle(o)} />{o}</label></li>
          ))}
        </ul>
      )}
    </span>
  );
}
