'use client';
// Themed date and time pickers for forms (instead of the browser's native ones), styled like the app's dropdowns and
// following light / dark mode. Values are submitted through a hidden input: dates as 'YYYY-MM-DD', times as 'HH:MM' (24 h).
// The popover is position:fixed so modal / table overflow can't clip it. DateField / TimeField add the label and the
// server-side error from the surrounding <ApiForm>, like <Field>.
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useFormState } from './form';

const Icon = ({ d }: { d: string }) => (
  <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);
const CAL = 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4', CLOCK = 'M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18zM12 7v5l3 2';
const pad = (n: number) => String(n).padStart(2, '0');

/** Open/close + fixed position under (or above) the trigger; closes on outside click, Escape, page scroll or resize. */
function usePopover(height: number) {
  const [pos, setPos] = useState<CSSProperties | null>(null);
  const btn = useRef<HTMLButtonElement>(null), pop = useRef<HTMLDivElement>(null);
  const open = () => {
    const r = btn.current!.getBoundingClientRect();
    const below = window.innerHeight - r.bottom > height + 12;
    setPos({ left: Math.min(r.left, window.innerWidth - 300), ...(below ? { top: r.bottom + 6 } : { bottom: window.innerHeight - r.top + 6 }) });
  };
  const close = (focus = true) => { setPos(null); if (focus) btn.current?.focus(); };
  useEffect(() => {
    if (!pos) return;
    const inside = (e: Event) => btn.current?.contains(e.target as Node) || pop.current?.contains(e.target as Node);
    const out = (e: Event) => { if (!inside(e)) close(false); };
    const away = (e: Event) => { if (!pop.current?.contains(e.target as Node)) close(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); close(); } };
    document.addEventListener('mousedown', out);
    document.addEventListener('keydown', esc);
    window.addEventListener('scroll', away, true);
    window.addEventListener('resize', away);
    return () => {
      document.removeEventListener('mousedown', out); document.removeEventListener('keydown', esc);
      window.removeEventListener('scroll', away, true); window.removeEventListener('resize', away);
    };
  }, [pos]); // eslint-disable-line react-hooks/exhaustive-deps
  return { pos, open, close, btn, pop, toggle: () => (pos ? close() : open()) };
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (d: string) => new Date(d + 'T00:00:00Z').toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export function DatePicker({ name, defaultValue = '', min, max, today, required, ariaLabel, invalid }: {
  name: string; defaultValue?: string; min?: string; max?: string; today: string; required?: boolean; ariaLabel: string; invalid?: boolean;
}) {
  const [val, setVal] = useState(defaultValue);
  const [view, setView] = useState(() => (defaultValue || today).slice(0, 7));
  const p = usePopover(340);
  const [y, m] = view.split('-').map(Number);
  const first = new Date(Date.UTC(y, m - 1, 1)).getUTCDay(), days = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const cells: (string | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => `${view}-${pad(i + 1)}`)];
  const off = (d: string) => (!!min && d < min) || (!!max && d > max);
  const step = (n: number) => { const d = new Date(Date.UTC(y, m - 1 + n, 1)); setView(`${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}`); };
  const pick = (d: string) => { setVal(d); p.close(); };
  return (
    <span className="dp">
      <input type="hidden" name={name} value={val} />
      <button ref={p.btn} type="button" className={`dd-btn dp-btn ${val ? '' : 'empty'} ${invalid ? 'bad' : ''}`} aria-label={`${ariaLabel}${val ? ': ' + longDate(val) : ''}`}
        aria-haspopup="dialog" aria-expanded={!!p.pos} aria-required={required} onClick={() => { if (!p.pos) setView((val || today).slice(0, 7)); p.toggle(); }}>
        <Icon d={CAL} /><span>{val ? longDate(val) : 'Select date'}</span>
      </button>
      {p.pos && (
        <div ref={p.pop} className="dp-pop" role="dialog" aria-label={ariaLabel} style={p.pos}>
          <div className="dp-head">
            <button type="button" onClick={() => step(-1)} aria-label="Previous month"><Icon d="M15 18l-6-6 6-6" /></button>
            <strong>{MONTHS[m - 1]} {y}</strong>
            <button type="button" onClick={() => step(1)} aria-label="Next month"><Icon d="M9 18l6-6-6-6" /></button>
          </div>
          <div className="dp-grid">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((w) => <span key={w} className="dp-wd">{w}</span>)}
            {cells.map((d, i) => d
              ? <button key={d} type="button" disabled={off(d)} className={`${d === val ? 'on' : ''} ${d === today ? 'today' : ''}`} aria-pressed={d === val}
                  aria-label={longDate(d)} onClick={() => pick(d)}>{+d.slice(8)}</button>
              : <span key={'x' + i} />)}
          </div>
          <div className="dp-foot">
            <button type="button" className="dp-link" disabled={off(today)} onClick={() => pick(today)}>Today</button>
            {!required && val && <button type="button" className="dp-link" onClick={() => pick('')}>Clear</button>}
          </div>
        </div>
      )}
    </span>
  );
}

/**
 * Form field for a date range, using the same "Custom date range" panel as the module header's date menu (From / To /
 * Apply) in a fixed popover. Submits `fromName` and `toName` as 'YYYY-MM-DD'; shows the form's server errors for either.
 */
export function DateRangeField({ fromName, toName, label, defaultFrom = '', defaultTo = '', max, onChange }: {
  fromName: string; toName: string; label: string; defaultFrom?: string; defaultTo?: string; max?: string; onChange?: (from: string, to: string) => void;
}) {
  const [val, setVal] = useState({ from: defaultFrom, to: defaultTo });
  const [draft, setDraft] = useState(val);
  const [err, setErr] = useState('');
  const p = usePopover(230);
  const errors = useFormState().errors, e = errors[fromName] || errors[toName];
  const apply = () => {
    if (!draft.from || !draft.to) return setErr('Choose both dates.');
    if (draft.from > draft.to) return setErr('From must be on or before To.');
    setErr(''); setVal(draft); onChange?.(draft.from, draft.to); p.close();
  };
  const text = val.from && val.to ? (val.from === val.to ? longDate(val.from) : `${longDate(val.from)} – ${longDate(val.to)}`) : 'Choose dates';
  return (
    <div className={`field ${e ? 'has-err' : ''}`}><label>{label}</label>
      <span className="dp">
        <input type="hidden" name={fromName} value={val.from} /><input type="hidden" name={toName} value={val.to} />
        <button ref={p.btn} type="button" className={`dd-btn dp-btn ${val.from ? '' : 'empty'} ${e ? 'bad' : ''}`} aria-label={`${label}: ${text}`}
          aria-haspopup="dialog" aria-expanded={!!p.pos} onClick={() => { if (!p.pos) { setDraft(val); setErr(''); } p.toggle(); }}>
          <Icon d={CAL} /><span>{text}</span>
        </button>
        {p.pos && (
          <div ref={p.pop} className="af-custom rng-pop" role="dialog" aria-label="Custom date range" style={p.pos}>
            <div className="af-custom-title">Custom date range</div>
            <label>From<span className="af-cal"><Icon d={CAL} /><input type="date" value={draft.from} max={draft.to || max} onChange={(x) => { setErr(''); setDraft({ ...draft, from: x.target.value }); }} /></span></label>
            <label>To<span className="af-cal"><Icon d={CAL} /><input type="date" value={draft.to} min={draft.from || undefined} max={max} onChange={(x) => { setErr(''); setDraft({ ...draft, to: x.target.value }); }} /></span></label>
            {err && <p className="af-err" role="alert">{err}</p>}
            <button type="button" className="btn af-apply" onClick={apply}>Apply</button>
          </div>
        )}
      </span>
      {e && <div className="err" role="alert">{e}</div>}
    </div>
  );
}

const to12 = (t: string) => { const h = +t.slice(0, 2); return { h: h % 12 || 12, m: +t.slice(3, 5), ap: h < 12 ? 'AM' : 'PM' }; };
const to24 = (h: number, m: number, ap: string) => `${pad((h % 12) + (ap === 'PM' ? 12 : 0))}:${pad(m)}`;
const shortTime = (t: string) => { const x = to12(t); return `${x.h}:${pad(x.m)} ${x.ap}`; };

/**
 * Inline 12-hour time entry: separate Hour / Minute / AM-PM selects (keyboard friendly, native on touch). The value is still
 * submitted as 'HH:MM' (24 h) through a hidden input, or '' when nothing is chosen. Choosing only some parts is an error.
 */
export function TimePicker({ name, defaultValue = '', ariaLabel, invalid, optional = true }: { name: string; defaultValue?: string; ariaLabel: string; invalid?: boolean; optional?: boolean }) {
  const init = /^\d{2}:\d{2}/.test(defaultValue) ? to12(defaultValue) : null;
  const [t, setT] = useState({ h: init ? String(init.h) : '', m: init ? pad(init.m) : '', ap: init ? init.ap : '' });
  const hr = useRef<HTMLSelectElement>(null);
  const filled = [t.h, t.m, t.ap].filter(Boolean).length;
  const partial = filled > 0 && filled < 3;
  const val = filled === 3 ? to24(+t.h, +t.m, t.ap) : '';
  const msg = partial ? `Choose the ${[!t.h && 'hour', !t.m && 'minute', !t.ap && 'AM or PM'].filter(Boolean).join(', ')} to complete the time.` : '';
  useEffect(() => { hr.current?.setCustomValidity(msg); }, [msg]);
  const sel = (k: 'h' | 'm' | 'ap', label: string, placeholder: string, opts: string[]) => (
    <select ref={k === 'h' ? hr : undefined} className={`tp-sel ${t[k] ? '' : 'empty'}`} aria-label={`${ariaLabel} ${label}`} aria-invalid={partial && !t[k] ? true : undefined}
      value={t[k]} onChange={(e) => setT({ ...t, [k]: e.target.value })}>
      <option value="">{placeholder}</option>
      {opts.map((o) => <option key={o} value={o}>{o}</option>)}
    </select>
  );
  return (
    <div className="tp-inline">
      <input type="hidden" name={name} value={val} />
      <div className={`tp-row ${invalid || partial ? 'bad' : ''}`} role="group" aria-label={ariaLabel}>
        {sel('h', 'hour', 'Hour', Array.from({ length: 12 }, (_, i) => String(i + 1)))}
        <span className="tp-colon" aria-hidden="true">:</span>
        {sel('m', 'minute', 'Min', Array.from({ length: 60 }, (_, i) => pad(i)))}
        {sel('ap', 'AM or PM', 'AM/PM', ['AM', 'PM'])}
        {filled > 0 && <button type="button" className="tp-clear" aria-label={`Clear ${ariaLabel.toLowerCase()}`} title="Clear time" onClick={() => setT({ h: '', m: '', ap: '' })}>×</button>}
      </div>
      <div className="small tp-sum" aria-live="polite">{val ? `Selected: ${shortTime(val)}` : optional ? 'Optional · 12-hour format' : '12-hour format · choose AM or PM'}</div>
      {partial && <div className="err" role="alert">{msg}</div>}
    </div>
  );
}

/** <DatePicker> with a label and the field's server-side error, laid out like <Field>. */
export function DateField({ name, label, ...rest }: { name: string; label: string; defaultValue?: string; min?: string; max?: string; today: string; required?: boolean }) {
  const e = useFormState().errors[name];
  return (
    <div className={`field ${e ? 'has-err' : ''}`}><label>{label}</label>
      <DatePicker name={name} ariaLabel={label.replace(' *', '')} invalid={!!e} {...rest} />
      {e && <div className="err" role="alert">{e}</div>}</div>
  );
}

export function TimeField({ name, label, defaultValue, optional = true }: { name: string; label: string; defaultValue?: string; optional?: boolean }) {
  const e = useFormState().errors[name];
  return (
    <div className={`field ${e ? 'has-err' : ''}`}><label>{label}</label>
      <TimePicker name={name} ariaLabel={label || 'Time'} defaultValue={defaultValue} invalid={!!e} optional={optional} />
      {e && <div className="err" role="alert">{e}</div>}</div>
  );
}
