'use client';
// Flash messages. A message set before a client navigation survives that one navigation (so "Saved." shows on the
// page you were redirected to) and is cleared by the next one. <FlashBar/> renders it; pages get one via <Page>.
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';

type Kind = 'ok' | 'err';
interface Flash { type: Kind; msg: string; seen: boolean }
interface Ctx { flash: Flash | null; show: (type: Kind, msg: string, willNavigate?: boolean) => void; clear: () => void }
const FlashCtx = createContext<Ctx>({ flash: null, show: () => {}, clear: () => {} });

export function FlashProvider({ children }: { children: ReactNode }) {
  const [flash, setFlash] = useState<Flash | null>(null);
  const pathname = usePathname();
  const show = useCallback((type: Kind, msg: string, willNavigate = false) => setFlash({ type, msg, seen: !willNavigate }), []);
  const clear = useCallback(() => setFlash(null), []);
  // On every route change: a message shown after the previous page is cleared; a pending one is marked as shown.
  useEffect(() => { setFlash((f) => (f ? (f.seen ? null : { ...f, seen: true }) : f)); }, [pathname]);
  const value = useMemo(() => ({ flash, show, clear }), [flash, show, clear]);
  return <FlashCtx.Provider value={value}>{children}</FlashCtx.Provider>;
}

export const useFlash = () => useContext(FlashCtx);

export function FlashBar() {
  const { flash } = useFlash();
  if (!flash) return null;
  return <div className={`flash ${flash.type}`} role="status">{flash.msg}</div>;
}
