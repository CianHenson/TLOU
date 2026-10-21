import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

// Flash messages shown at the top of the staff area, like the original flash(ok|err, msg).
interface Flash { type: 'ok' | 'err'; msg: string }
interface FlashValue {
  flash: Flash | null;
  ok: (msg: string) => void;
  err: (msg: string) => void;
  clear: () => void;
}

const Ctx = createContext<FlashValue>(null!);
export const useFlash = () => useContext(Ctx);

export function FlashProvider({ children }: { children: ReactNode }) {
  const [flash, setFlash] = useState<Flash | null>(null);
  const ok = useCallback((msg: string) => setFlash({ type: 'ok', msg }), []);
  const err = useCallback((msg: string) => setFlash({ type: 'err', msg }), []);
  const clear = useCallback(() => setFlash(null), []);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(null), 8000);
    return () => clearTimeout(t);
  }, [flash]);

  return <Ctx.Provider value={{ flash, ok, err, clear }}>{children}</Ctx.Provider>;
}
