// Live input clean-up for forms (onInput handlers). Each rewrites the field's value as the user types and puts the caret back.
export type InputEv = React.FormEvent<HTMLInputElement>;
/** Capitalise the first letter of every word (names, places), keeping the rest as typed. */
export const titleCase = (e: InputEv) => {
  const el = e.currentTarget, at = el.selectionStart;
  el.value = el.value.replace(/(^|[\s,\-/(.])(\p{Ll})/gu, (_, p: string, c: string) => p + c.toUpperCase());
  el.setSelectionRange(at, at);
};
/** Digits only, with an optional leading + (e.g. +639171234567). */
export const digitsOnly = (e: InputEv) => {
  const el = e.currentTarget, before = el.value.slice(0, el.selectionStart ?? 0);
  const clean = (v: string) => v.replace(/[^\d+]/g, '').replace(/(?!^)\+/g, '');
  el.value = clean(el.value);
  const at = clean(before).length;
  el.setSelectionRange(at, at);
};
/** 1234567.5 -> "1,234,567.5": thousands commas while typing, at most 2 decimals. */
export const withCommas = (v: string) => {
  const [i, d] = v.replace(/[^\d.]/g, '').split('.');
  const int = (i.replace(/^0+(?=\d)/, '') || (d !== undefined ? '0' : '')).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return d === undefined ? int : `${int}.${d.slice(0, 2)}`;
};
export const moneyInput = (e: InputEv) => {
  const el = e.currentTarget, kept = el.value.slice(0, el.selectionStart ?? 0).replace(/[^\d.]/g, '').length;
  el.value = withCommas(el.value);
  let at = 0;
  for (let n = 0; at < el.value.length && n < kept; at++) if (/[\d.]/.test(el.value[at])) n++;
  el.setSelectionRange(at, at);
};
