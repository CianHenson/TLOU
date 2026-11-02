'use client';
// Category and Payment method fields of the expense forms. Choosing "Add new category…" (Category) or "Other" (Payment method)
// turns the dropdown into a text box in the same place, with a button to go back to the list. The server (expenseInput)
// reads category_new / method_other when the hidden category / method value is NEW_CATEGORY / "Other". New categories join
// the Category list once an expense uses them (expenseCategories); other payment methods are kept on that expense only.
import { useState } from 'react';
import { Dropdown } from './dropdown';
import { METHODS } from '@/lib/types';

const NEW_CATEGORY = '__new';

/** The dropdown's text-box mode: the typed value is sent as `name`, and `✕` returns to the list. */
function TypeIn({ label, hidden, name, defaultValue, placeholder, maxLength, onBack }: {
  label: string; hidden: [string, string]; name: string; defaultValue?: string; placeholder: string; maxLength: number; onBack: () => void;
}) {
  return (
    <div className="field">
      <label htmlFor={`f-${name}`}>{label}</label>
      <input type="hidden" name={hidden[0]} value={hidden[1]} />
      <div style={{ display: 'flex', gap: 6 }}>
        <input id={`f-${name}`} name={name} defaultValue={defaultValue} required maxLength={maxLength} placeholder={placeholder} autoFocus style={{ flex: 1, minWidth: 0 }} />
        <button type="button" className="btn ghost sm" onClick={onBack} aria-label="Back to the list" title="Back to the list">✕</button>
      </div>
    </div>
  );
}

export function CategoryField({ categories, defaultValue, label = 'Category *' }: { categories: string[]; defaultValue?: string; label?: string }) {
  const start = defaultValue && categories.includes(defaultValue) ? defaultValue : categories[0];
  const [v, setV] = useState(start);
  const [last, setLast] = useState(start);
  if (v === NEW_CATEGORY) {
    return <TypeIn label={label} hidden={['category', NEW_CATEGORY]} name="category_new" placeholder="Type the new category" maxLength={40} onBack={() => setV(last)} />;
  }
  return (
    <div className="field"><label>{label}</label>
      <Dropdown key={last} name="category" ariaLabel={label.replace(' *', '')} options={[...categories, [NEW_CATEGORY, '+ Add new category…']]} defaultValue={v}
        onChange={(x) => { if (x !== NEW_CATEGORY) setLast(x); setV(x); }} style={{ width: '100%' }} /></div>
  );
}

export function MethodField({ defaultValue }: { defaultValue?: string }) {
  const custom = !!defaultValue && !METHODS.includes(defaultValue);
  const start = defaultValue && METHODS.includes(defaultValue) ? defaultValue : METHODS[0];
  const [v, setV] = useState(custom ? 'Other' : start);
  const [last, setLast] = useState(start);
  if (v === 'Other') {
    return <TypeIn label="Payment method *" hidden={['method', 'Other']} name="method_other" defaultValue={custom ? defaultValue : ''} placeholder="Type the payment method" maxLength={30} onBack={() => setV(last)} />;
  }
  return (
    <div className="field"><label>Payment method *</label>
      <Dropdown key={last} name="method" ariaLabel="Payment method" options={METHODS} defaultValue={v}
        onChange={(x) => { if (x !== 'Other') setLast(x); setV(x); }} style={{ width: '100%' }} /></div>
  );
}
