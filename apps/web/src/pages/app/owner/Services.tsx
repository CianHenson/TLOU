import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState, type FormEvent } from 'react';
import { get, post } from '../../../lib/api';
import { useFlash } from '../../../lib/flash';
import { useForm } from '../../../lib/form';
import { usePageTitle } from '../../../lib/title';
import Field, { CheckField } from '../../../ui/Field';

interface Svc { id: number | ''; name: string; type: string; description: string; icon: string; active: number; sort: number }

function ServiceForm({ s, types, onSaved }: { s: Svc; types: string[]; onSaved: () => void }) {
  const flash = useFlash();
  const f = useForm({ name: s.name, type: s.type, icon: s.icon, sort: String(s.sort), description: s.description, active: !!s.active });
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    f.reset();
    setBusy(true);
    try {
      await post('/services', { id: s.id, ...f.v, sort: Number(f.v.sort) || 0 });
      flash.ok('Service saved.');
      if (!s.id) f.setV({ name: '', type: '', icon: '', sort: String(s.sort + 1), description: '', active: true });
      onSaved();
    } catch (err) {
      f.fail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={submit}>
      <h3>{s.id ? 'Edit service' : 'Add service'}</h3>
      {f.message && <div className="flash err" role="alert">{f.message}</div>}
      <div className="grid g3">
        <Field label="Name" required maxLength={120} {...f.bind('name')} />
        <Field label="Request form type" type="select" options={types} required {...f.bind('type')} />
        <div className="field"><label>Icon (emoji) / order</label>
          <div className="row">
            <input value={f.v.icon} maxLength={8} style={{ width: 80 }} onChange={(e) => f.setV((p) => ({ ...p, icon: e.target.value }))} />
            <input type="number" value={f.v.sort} style={{ width: 80 }} onChange={(e) => f.setV((p) => ({ ...p, sort: e.target.value }))} />
          </div>
        </div>
      </div>
      <Field label="Description" type="textarea" maxLength={600} {...f.bind('description')} />
      <CheckField name="active" label="Shown on website" checked={f.v.active} onChange={(c) => f.setV((p) => ({ ...p, active: c }))} />
      <button className="btn sm" disabled={busy}>{busy ? <><span className="spin" />Please wait…</> : s.id ? 'Save' : 'Add'}</button>
    </form>
  );
}

export default function Services() {
  usePageTitle('Service Management');
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['owner-services'], queryFn: () => get<{ services: Svc[]; types: string[] }>('/services') });
  if (!data) return <p className="muted">Loading…</p>;
  // A saved service also changes the public site, so refresh that cache too.
  const saved = () => { qc.invalidateQueries({ queryKey: ['owner-services'] }); qc.invalidateQueries({ queryKey: ['site'] }); };
  const blank: Svc = { id: '', name: '', type: '', description: '', icon: '', active: 1, sort: data.services.length };

  return (
    <>
      {data.services.map((s) => <ServiceForm key={`${s.id}-${s.name}-${s.active}-${s.sort}`} s={s} types={data.types} onSaved={saved} />)}
      <ServiceForm key={`new-${data.services.length}`} s={blank} types={data.types} onSaved={saved} />
    </>
  );
}
