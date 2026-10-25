'use client';
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Renders children into the page's `.shell` (outside the module header) once mounted. Modals opened from header
 * buttons use it so the header's own input / button styles don't leak into them, while they keep the theme tokens.
 */
export function ShellPortal({ children }: { children: ReactNode }) {
  const [host, setHost] = useState<Element | null>(null);
  useEffect(() => setHost(document.querySelector('.shell') ?? document.body), []);
  return host ? createPortal(children, host) : null;
}
