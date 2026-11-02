'use client';
// "Sort by" / "Group by" for list tables, offered in the right-click menu on the table's empty space. Both live in the URL
// (?sort=&dir=&group=), so the server returns the rows already sorted, and rows grouped by the chosen key come out in one run;
// the table then only has to print a heading row whenever the group changes (groupedRows in group-rows.tsx). Each list's query decides which
// keys are allowed (see orderBy / sortClause in lib/list.ts).
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

export type Opt = [key: string, label: string];
export interface SortGroup { sorts?: Opt[]; groups?: Opt[] }

function useSortGroup() {
  const router = useRouter(), path = usePathname(), sp = useSearchParams();
  const sort = sp.get('sort') || '', dir = sp.get('dir') === 'asc' ? 'asc' : 'desc', group = sp.get('group') || '';
  const go = (patch: Record<string, string | null>) => {
    const p = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) { if (v) p.set(k, v); else p.delete(k); }
    p.delete('page');
    router.push(`${path}?${p.toString()}`);
  };
  return { sort, dir, group, go };
}

/** One submenu that opens beside the menu (to the left when there is no room on the right). */
function Sub({ label, current, children }: { label: string; current?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [place, setPlace] = useState<{ left: boolean; shift: number }>({ left: false, shift: 0 });
  const box = useRef<HTMLDivElement>(null), fly = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open || !box.current || !fly.current) return;
    const b = box.current.getBoundingClientRect(), f = fly.current.getBoundingClientRect();
    setPlace({ left: b.right + f.width > window.innerWidth - 8, shift: Math.min(0, window.innerHeight - 8 - (b.top + f.height)) });
  }, [open]);
  return (
    <div className="ctx-sub" ref={box} onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button type="button" role="menuitem" aria-haspopup="menu" aria-expanded={open} className="ctx-parent" onClick={() => setOpen((o) => !o)}>
        <span>{label}</span><span className="muted small">{current ? `${current} ` : ''}›</span>
      </button>
      {open && <div className="ctx-fly" role="menu" ref={fly} style={{ [place.left ? 'right' : 'left']: '100%', top: place.shift - 6 }}>{children}</div>}
    </div>
  );
}

/** The Sort by / Group by entries for a table's empty-space menu. `done` closes the menu. */
export function SortGroupItems({ sg, done }: { sg: SortGroup; done: () => void }) {
  const { sort, dir, group, go } = useSortGroup();
  const apply = (patch: Record<string, string | null>) => { done(); go(patch); };
  const sorts = sg.sorts ?? [], groups = sg.groups ?? [];
  if (!sorts.length && !groups.length) return null;
  const tick = (on: boolean) => <span className="ctx-tick" aria-hidden="true">{on ? '✓' : ''}</span>;
  return (
    <>
      <div className="ctx-sep" role="separator" />
      {!!sorts.length && (
        <Sub label="Sort by" current={sorts.find(([k]) => k === sort)?.[1]}>
          {sorts.map(([k, l]) => <button key={k} type="button" role="menuitemradio" aria-checked={sort === k} onClick={() => apply({ sort: k, dir: sort ? dir : 'asc' })}>{tick(sort === k)}{l}</button>)}
          <div className="ctx-sep" role="separator" />
          <button type="button" role="menuitemradio" aria-checked={!!sort && dir === 'asc'} disabled={!sort} onClick={() => apply({ dir: 'asc' })}>{tick(!!sort && dir === 'asc')}Ascending</button>
          <button type="button" role="menuitemradio" aria-checked={!!sort && dir === 'desc'} disabled={!sort} onClick={() => apply({ dir: 'desc' })}>{tick(!!sort && dir === 'desc')}Descending</button>
          {!!sort && <button type="button" role="menuitem" onClick={() => apply({ sort: null, dir: null })}>{tick(false)}Default order</button>}
        </Sub>
      )}
      {!!groups.length && (
        <Sub label="Group by" current={groups.find(([k]) => k === group)?.[1]}>
          <button type="button" role="menuitemradio" aria-checked={!group} onClick={() => apply({ group: null })}>{tick(!group)}None</button>
          {groups.map(([k, l]) => <button key={k} type="button" role="menuitemradio" aria-checked={group === k} onClick={() => apply({ group: k })}>{tick(group === k)}{l}</button>)}
        </Sub>
      )}
    </>
  );
}

/** The label function for the group chosen in the URL (`fns` is keyed like the table's group options), or null when not grouped. */
export function useGroupOf<T>(fns: Record<string, (r: T) => string>): ((r: T) => string) | null {
  const g = useSearchParams().get('group') || '';
  return fns[g] ?? null;
}
