/** Sortable table header cell, working with useList(): click toggles the sort column / direction. */
export default function SortTh({ label, col, params, set, className }: {
  label: string; col: string; params: Record<string, string>; set: (p: Record<string, string>) => void; className?: string;
}) {
  const active = params.sort === col;
  const dir = active && params.dir === 'asc' ? 'desc' : 'asc';
  return (
    <th className={className}>
      <a href="#" onClick={(e) => { e.preventDefault(); set({ sort: col, dir }); }}>
        {label}{active ? (params.dir === 'asc' ? ' ▲' : ' ▼') : ''}
      </a>
    </th>
  );
}
