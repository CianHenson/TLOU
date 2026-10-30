'use client';
// List-page filters (Airfare Sales, Monitoring Finances), in two places: the date menu in the module header and the
// search / dropdown / export toolbar above the table. Every change applies at once by merging into the current URL query
// (the server page re-renders): dropdowns and dates immediately, the search box after a short pause. Each part only
// touches its own query keys.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Dropdown, type DropdownOption } from './dropdown';
import { MultiDropdown } from './multi-dropdown';
import { confirmExport } from './confirm';

const PRESETS: [string, string][] = [['', 'All dates'], ['today', 'Today'], ['yesterday', 'Yesterday'], ['week', 'This week'], ['month', 'This month'], ['year', 'This year']];

const shift = (d: string, n: number) => { const x = new Date(d + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + n); return x.toISOString().slice(0, 10); };
/** [from, to] for a preset, relative to `today` (Asia/Manila, from the server). Weeks start on Monday. */
function presetRange(key: string, today: string): [string, string] {
  const [y, m] = today.split('-');
  switch (key) {
    case 'today': return [today, today];
    case 'yesterday': { const d = shift(today, -1); return [d, d]; }
    case 'week': return [shift(today, -((new Date(today + 'T00:00:00Z').getUTCDay() + 6) % 7)), today];
    case 'month': return [`${y}-${m}-01`, shift(`${m === '12' ? +y + 1 : y}-${m === '12' ? '01' : String(+m + 1).padStart(2, '0')}-01`, -1)];
    case 'year': return [`${y}-01-01`, `${y}-12-31`];
    default: return ['', ''];
  }
}
const short = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const CAL = 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4';

/** Returns apply(patch): sets / clears the given query keys on the current URL and resets paging. */
function useApply() {
  const router = useRouter(), path = usePathname(), sp = useSearchParams();
  return (patch: Record<string, string>) => {
    const qs = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) if (v && !(k === 'by' && v === 'txn')) qs.set(k, v); else qs.delete(k);
    qs.delete('page');
    router.replace(qs.size ? `${path}?${qs}` : path, { scroll: false });
  };
}

/** `multiple`: tick several options (value = comma-joined, '' = all); `options[0]`'s label is then the "all" text and the rest are the choices. */
export interface ToolbarDropdown { key: string; label: string; value: string; options: DropdownOption[]; multiple?: boolean; noun?: string }

/**
 * Toolbar above the table columns: search box (query key `q`) and themed dropdowns on the left, Export on the right.
 * A dropdown's '' option clears its key.
 */
export function TableFilters({ q, placeholder, dropdowns, exportHref, exportTitle, exportNote, lead, trail }: {
  /** Shown at the far right of the toolbar (e.g. My Attendance's payslip button). */
  trail?: ReactNode;
  /** Shown right after the search box, before the dropdowns (e.g. a section switcher). */
  lead?: ReactNode;
  /** Without `exportHref` the Export button is left out. */
  q: string; placeholder: string; dropdowns: ToolbarDropdown[]; exportHref?: string; exportTitle?: string;
  /** When set, Export first asks the user to confirm this message (used to warn that active filters limit the file). */
  exportNote?: string;
}) {
  const apply = useApply();
  const [text, setText] = useState(q);
  const [vals, setVals] = useState(() => Object.fromEntries(dropdowns.map((d) => [d.key, d.value])));
  const appliedQ = useRef(q);
  useEffect(() => {
    if (text === appliedQ.current) return;
    const t = setTimeout(() => { appliedQ.current = text; apply({ q: text }); }, 400);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  const set = (k: string, val: string) => { setVals({ ...vals, [k]: val }); apply({ [k]: val }); };
  return (
    <form className="tw-tools" role="search" onSubmit={(e) => { e.preventDefault(); appliedQ.current = text; apply({ q: text }); }}>
      <div className="tt-search">
        <Icon d="M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14zM21 21l-4.35-4.35" />
        <input type="search" value={text} onChange={(e) => setText(e.target.value)} placeholder={placeholder} aria-label="Search" />
      </div>
      {lead}
      {dropdowns.map((d) => d.multiple
        ? <MultiDropdown key={d.key} ariaLabel={d.label} value={vals[d.key]} onChange={(x) => set(d.key, x)} noun={d.noun ?? 'items'}
            allLabel={String(Array.isArray(d.options[0]) ? d.options[0][1] : d.options[0])} options={d.options.slice(1).map((o) => (Array.isArray(o) ? o[0] : o))} />
        : <Dropdown key={d.key} ariaLabel={d.label} value={vals[d.key]} onChange={(x) => set(d.key, x)} options={d.options} />)}
      {exportHref && <a className="btn ghost tt-export" href={exportHref} title={exportTitle} onClick={(e) => confirmExport(e, exportHref, exportNote)}><Icon d="M12 3v12M7 10l5 5 5-5M5 21h14" />Export</a>}
      {trail && <span className={exportHref ? undefined : 'tt-trail'}>{trail}</span>}
    </form>
  );
}

/** Airfare Sales toolbar: search, airlines and check-in statuses (multi-select), Export. */
export function AirfareTableFilters({ initial, airlines, statuses, exportHref, exportNote }: {
  initial: { q: string; airline: string; status: string }; airlines: string[]; statuses: string[]; exportHref: string; exportNote?: string;
}) {
  return (
    <TableFilters q={initial.q} placeholder="Search passenger, PNR, flight no., contact" exportHref={exportHref} exportTitle="Export the filtered sales as CSV" exportNote={exportNote} dropdowns={[
      { key: 'airline', label: 'Airline', value: initial.airline, options: [['', 'All airlines'], ...airlines], multiple: true, noun: 'airlines' },
      { key: 'status', label: 'Check-in status', value: initial.status, options: [['', 'All check-in statuses'], ...statuses], multiple: true, noun: 'statuses' },
    ]} />
  );
}

/**
 * Date menu for the module header: presets and a custom range, plus (with `showBy`) the Transaction / Travel date switch.
 * `allValue` is the `range` value "All dates" writes; pages that default to a period (Monitoring Finances shows this
 * month) pass 'all' so "All dates" survives the round trip instead of falling back to that default. `allowAll={false}`
 * hides "All dates" (the Dashboard always shows a bounded period).
 */
export function DateRangeFilter({ initial, today, showBy = true, allValue = '', allowAll = true }: {
  initial: { by: string; from: string; to: string; range: string }; today: string; showBy?: boolean; allValue?: string; allowAll?: boolean;
}) {
  const presets: [string, string][] = PRESETS.filter(([k]) => k || allowAll).map(([k, l]) => [k || allValue, l]);
  const apply = useApply();
  const [v, setV] = useState(initial);
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [hover, setHover] = useState(false);
  const [draft, setDraft] = useState({ from: initial.from, to: initial.to });
  const [err, setErr] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const hoverT = useRef<ReturnType<typeof setTimeout>>(undefined);
  // The custom-range side panel opens on hover (with a short grace period to move the pointer across) or stays open once clicked.
  const enter = () => { clearTimeout(hoverT.current); setHover(true); };
  const leave = () => { hoverT.current = setTimeout(() => setHover(false), 250); };

  useEffect(() => {
    if (!open) { setCustom(false); setHover(false); return; }
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', close); };
  }, [open]);

  const go = (next: typeof v) => { setV(next); apply(showBy ? next : { from: next.from, to: next.to, range: next.range }); };
  const pick = (key: string) => {
    const [from, to] = presetRange(key, today);
    setOpen(false);
    setDraft({ from, to });
    go({ ...v, range: key, from, to });
  };
  const applyCustom = () => {
    if (!draft.from || !draft.to) return setErr('Choose both dates.');
    if (draft.from > draft.to) return setErr('From must be on or before To.');
    setErr(''); setOpen(false);
    go({ ...v, ...draft, range: 'custom' });
  };
  const label = v.range === 'custom'
    ? (v.from && v.to ? (v.from === v.to ? short(v.from) : `${short(v.from)} – ${short(v.to)}`) : 'Custom range')
    : presets.find(([k]) => k === v.range)?.[1] ?? 'All dates';

  return (
    <div className="af-date" ref={box}>
      <button type="button" className={`af-date-btn ${v.range && v.range !== allValue ? 'set' : ''}`} onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}>
        <Icon d={CAL} /><span>{label}</span><Icon d="M6 9l6 6 6-6" />
      </button>
      {open && (
        <div className="af-menu" role="menu">
          {showBy && <div className="af-by" role="group" aria-label="Filter dates by">
            {[['txn', 'Transaction date'], ['travel', 'Travel date']].map(([k, l]) => (
              <button key={k} type="button" className={v.by === k ? 'on' : ''} aria-pressed={v.by === k} onClick={() => go({ ...v, by: k })}>{l}</button>
            ))}
          </div>}
          {presets.map(([k, l]) => (
            <button key={k || 'all'} type="button" role="menuitemradio" aria-checked={v.range === k} className={`af-item ${v.range === k ? 'on' : ''}`} onMouseEnter={() => setHover(false)} onClick={() => pick(k)}>{l}</button>
          ))}
          <hr />
          <div className="af-custom-wrap" onMouseEnter={enter} onMouseLeave={leave}>
            <button type="button" role="menuitemradio" aria-checked={v.range === 'custom'} aria-expanded={custom || hover}
              className={`af-item af-has-side ${v.range === 'custom' ? 'on' : ''} ${custom || hover ? 'open' : ''}`} onClick={() => setCustom(true)}>Custom date range</button>
            {(custom || hover) && (
              <div className="af-custom" role="group" aria-label="Custom date range">
                <div className="af-custom-title">Custom date range</div>
                <label>From<span className="af-cal"><Icon d={CAL} /><input type="date" value={draft.from} max={draft.to || undefined} onFocus={() => setCustom(true)}
                  onChange={(e) => { setErr(''); setDraft({ ...draft, from: e.target.value }); }} /></span></label>
                <label>To<span className="af-cal"><Icon d={CAL} /><input type="date" value={draft.to} min={draft.from || undefined} onFocus={() => setCustom(true)}
                  onChange={(e) => { setErr(''); setDraft({ ...draft, to: e.target.value }); }} /></span></label>
                {err && <p className="af-err" role="alert">{err}</p>}
                <button type="button" className="btn af-apply" onClick={applyCustom}>Apply</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
