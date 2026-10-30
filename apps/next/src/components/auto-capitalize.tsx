'use client';
import { useEffect } from 'react';

/** Types that hold free text; email, password, url, number, date etc. are left alone. */
const TEXT = new Set(['text', 'search', 'tel']);

/**
 * Capitalizes the first letter of every text box and textarea as the user types (opt out with `data-no-caps`).
 * Runs in the capture phase so React's onChange already sees the corrected value.
 */
export function AutoCapitalize() {
  useEffect(() => {
    const on = (ev: Event) => {
      const el = ev.target;
      if (!(el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement)) return;
      if (el instanceof HTMLInputElement && !TEXT.has(el.type)) return;
      if (el.dataset.noCaps !== undefined || !/^\p{Ll}/u.test(el.value)) return;
      const [s, e] = [el.selectionStart, el.selectionEnd];
      el.value = el.value[0]!.toUpperCase() + el.value.slice(1);
      if (s != null && e != null) el.setSelectionRange(s, e);
    };
    document.addEventListener('input', on, true);
    return () => document.removeEventListener('input', on, true);
  }, []);
  return null;
}
