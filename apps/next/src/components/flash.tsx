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

/** Inline message by default; with `toast` it floats bottom-right, auto-hides and can be dismissed (used inside the /app shell). */
export function FlashBar({ toast = false }: { toast?: boolean }) {
  const { flash, clear } = useFlash();
  useEffect(() => {
    if (!toast || !flash) return;
    const t = setTimeout(clear, flash.type === "err" ? 7000 : 4000);
    return () => clearTimeout(t);
  }, [toast, flash, clear]);
  if (!flash) return null;
  if (!toast) return <div className={`flash ${flash.type}`} role="status">{flash.msg}</div>;
  return (
    <div className={`toast ${flash.type}`} role={flash.type === "err" ? "alert" : "status"} aria-live="polite">
      <span className="toast-ico" aria-hidden="true">{flash.type === "ok" ? "✓" : "!"}</span>
      <span className="toast-msg">{flash.msg}</span>
      <button type="button" className="toast-x" onClick={clear} aria-label="Dismiss">×</button>
    </div>
  );
}
