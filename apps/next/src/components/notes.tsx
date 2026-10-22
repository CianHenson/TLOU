// Internal notes card shared by customer, request and booking pages. Posts to POST /api/notes.
import { ApiForm, Submit } from './form';
import { dt } from './ui';

export function Notes({ entity, id, notes }: { entity: 'customer' | 'request' | 'booking'; id: number; notes: { id: number; body: string; author: string | null; at: string }[] }) {
  return (
    <div className="card">
      <h3>Internal notes</h3>
      <ApiForm action="/api/notes" reset className="row" style={{ alignItems: 'start' }}>
        <input type="hidden" name="entity" value={entity} />
        <input type="hidden" name="entity_id" value={id} />
        <textarea name="body" rows={2} maxLength={2000} placeholder="Add an internal note (not visible to customers)" required style={{ flex: 1, minWidth: 220 }} />
        <Submit>Add note</Submit>
      </ApiForm>
      <ul className="timeline">
        {notes.map((n) => <li key={n.id}><div>{n.body}</div><div className="small muted">{n.author || 'System'} · {dt(n.at)}</div></li>)}
        {!notes.length && <li className="muted small">No notes yet.</li>}
      </ul>
    </div>
  );
}
