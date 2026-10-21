import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { get } from './api';
import type { Page } from './types';

/**
 * A server-paginated, filterable, sortable list driven by the URL query string (like the original
 * list screens): ?q=..&status=..&sort=..&dir=..&page=N. Filters change -> page resets to 1.
 */
export function useList<T>(path: string) {
  const [sp, setSp] = useSearchParams();
  const qs = sp.toString();
  const query = useQuery({ queryKey: [path, qs], queryFn: () => get<Page<T>>(path + (qs ? `?${qs}` : '')) });
  const params = Object.fromEntries(sp.entries());

  /** Merge into the query string; empty values remove the key. Page resets unless `page` is given. */
  const set = (patch: Record<string, string | number | undefined | null>) => {
    const next = new URLSearchParams(sp);
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === null || v === '') next.delete(k);
      else next.set(k, String(v));
    }
    if (!('page' in patch)) next.delete('page');
    setSp(next);
  };
  return { ...query, params, set, qs };
}
