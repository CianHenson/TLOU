import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

// The staff layout shows each page's title in its top bar (the original passed `title` to the layout).
const Ctx = createContext<{ title: string; setTitle: (t: string) => void }>({ title: '', setTitle: () => undefined });

export function TitleProvider({ children }: { children: ReactNode }) {
  const [title, setTitle] = useState('');
  return <Ctx.Provider value={{ title, setTitle }}>{children}</Ctx.Provider>;
}

export const useTitle = () => useContext(Ctx).title;

/** Call at the top of a page component: usePageTitle('Customers'). */
export function usePageTitle(title: string) {
  const { setTitle } = useContext(Ctx);
  useEffect(() => {
    setTitle(title);
    document.title = title;
  }, [title, setTitle]);
}
