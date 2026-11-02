// Cell content for the "Modified by" column: the name of whoever last changed the record (see lib/queries/modified.ts).
export function ModBy({ r }: { r: { mod_by?: string; mod_at?: string } }) {
  if (!r.mod_by && !r.mod_at) return <span className="muted">—</span>;
  return <>{r.mod_by || 'Unknown'}</>;
}
