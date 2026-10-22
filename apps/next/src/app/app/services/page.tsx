import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { SERVICE_TYPES } from '@/lib/types';
import { Page } from '@/components/ui';
import { ApiForm, Submit } from '@/components/form';

export const metadata = { title: 'Service Management' };

export default async function Services() {
  await requireUser('owner');
  const services = await db.all('SELECT * FROM services ORDER BY sort,id');
  const rows = [...services, { id: '', name: '', type: '', description: '', icon: '', active: 1, sort: services.length }];
  return (
    <Page title="Service Management">
      {rows.map((s) => (
        <ApiForm key={s.id || 'new'} action="/api/services" className="card" reset={!s.id}>
          <input type="hidden" name="id" value={s.id} />
          <h3>{s.id ? 'Edit service' : 'Add service'}</h3>
          <div className="grid g3">
            <div className="field"><label>Name</label><input name="name" defaultValue={s.name} required maxLength={120} /></div>
            <div className="field"><label>Request form type</label><select name="type" required defaultValue={s.type}>{SERVICE_TYPES.map((t) => <option key={t}>{t}</option>)}</select></div>
            <div className="field"><label>Icon (emoji) / order</label><div className="row"><input name="icon" defaultValue={s.icon ?? ''} maxLength={8} style={{ width: 80 }} /><input name="sort" type="number" defaultValue={s.sort} style={{ width: 80 }} /></div></div>
          </div>
          <div className="field"><label>Description</label><textarea name="description" rows={2} maxLength={600} defaultValue={s.description ?? ''} /></div>
          <label style={{ fontWeight: 400 }}><input type="checkbox" name="active" defaultChecked={!!s.active} /> Shown on website</label>{' '}
          <Submit className="btn sm">{s.id ? 'Save' : 'Add'}</Submit>
        </ApiForm>
      ))}
    </Page>
  );
}
