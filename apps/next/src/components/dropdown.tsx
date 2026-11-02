'use client';
// Themed replacement for <select>: a button plus a listbox styled like the rest of the app (light / dark), instead of
// the browser's native list. The list is position:fixed under (or above) the button, so table / modal overflow
// can't clip it. Pass `name` to submit the value with a form (hidden input), `onChange` to react to picks.
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';

export type DropdownOption = string | [string, string];

export function Dropdown({ options, value, defaultValue = '', onChange, name, ariaLabel, className = '', style, placeholder }: {
  options: DropdownOption[]; value?: string; defaultValue?: string; onChange?: (v: string) => void;
  name?: string; ariaLabel: string; className?: string; style?: CSSProperties;
  /** Shown on the button while no option is chosen (it is not an entry of the list). */
  placeholder?: string;
}) {
  const opts = options.map((o) => (Array.isArray(o) ? o : [o, o] as [string, string]));
  const [inner, setInner] = useState(defaultValue);
  const cur = value ?? inner;
  const [pos, setPos] = useState<CSSProperties | null>(null);
  const [active, setActive] = useState(0);
  const btn = useRef<HTMLButtonElement>(null), list = useRef<HTMLUListElement>(null);
  const id = useId();

  const open = () => {
    const r = btn.current!.getBoundingClientRect();
    const h = Math.min(opts.length * 38 + 12, 300), below = window.innerHeight - r.bottom > h + 12;
    setPos({ left: r.left, minWidth: r.width, ...(below ? { top: r.bottom + 6 } : { bottom: window.innerHeight - r.top + 6 }) });
    setActive(Math.max(0, opts.findIndex(([v]) => v === cur)));
  };
  const close = (focus = true) => { setPos(null); if (focus) btn.current?.focus(); };
  const pick = (v: string) => { setInner(v); onChange?.(v); close(); };

  useEffect(() => {
    if (!pos) return;
    const out = (e: Event) => { if (!btn.current?.contains(e.target as Node) && !list.current?.contains(e.target as Node)) close(false); };
    const away = (e: Event) => { if (!list.current?.contains(e.target as Node)) close(false); };
    document.addEventListener('mousedown', out);
    window.addEventListener('scroll', away, true);
    window.addEventListener('resize', away);
    return () => { document.removeEventListener('mousedown', out); window.removeEventListener('scroll', away, true); window.removeEventListener('resize', away); };
  }, [pos]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (pos) list.current?.children[active]?.scrollIntoView({ block: 'nearest' }); }, [pos, active]);

  const key = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!pos) return open();
      setActive((a) => (a + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length);
    } else if ((e.key === 'Enter' || e.key === ' ') && pos) { e.preventDefault(); pick(opts[active][0]); }
    else if (e.key === 'Escape' && pos) { e.preventDefault(); close(); }
    else if (e.key === 'Tab' && pos) close(false);
  };

  return (
    <span className={`dd ${className}`} style={style}>
      {name && <input type="hidden" name={name} value={cur} />}
      <button ref={btn} type="button" className="dd-btn" aria-label={ariaLabel} aria-haspopup="listbox" aria-expanded={!!pos}
        aria-controls={pos ? id : undefined} aria-activedescendant={pos ? `${id}-${active}` : undefined}
        onClick={() => (pos ? close() : open())} onKeyDown={key}>
        <span>{opts.find(([v]) => v === cur)?.[1] ?? (cur || placeholder) ?? cur}</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {pos && (
        <ul ref={list} id={id} className="dd-list" role="listbox" aria-label={ariaLabel} style={pos}>
          {opts.map(([v, l], i) => (
            <li key={v || '_'} id={`${id}-${i}`} role="option" aria-selected={v === cur} className={`${v === cur ? 'on' : ''} ${i === active ? 'act' : ''}`}
              onMouseEnter={() => setActive(i)} onMouseDown={(e) => e.preventDefault()} onClick={() => pick(v)}>{l}</li>
          ))}
        </ul>
      )}
    </span>
  );
}
