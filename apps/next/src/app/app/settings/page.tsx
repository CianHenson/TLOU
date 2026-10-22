import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { settings } from '@/lib/biz';
import { listBackups } from '@/lib/backup';
import { SYSTEM_KEYS } from '@/lib/queries/owner';
import { Page } from '@/components/ui';
import { ApiForm, Submit } from '@/components/form';
import { SettingsForm } from '@/components/settings-form';

export const metadata = { title: 'System Settings' };

export default async function SettingsPage() {
  await requireUser('owner');
  const [S, backups, messages] = await Promise.all([settings(), listBackups(), db.all('SELECT * FROM messages ORDER BY id DESC LIMIT 20')]);
  return (
    <Page title="System Settings">
      <SettingsForm mode="system" keys={SYSTEM_KEYS} values={S} />
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card"><h3>Backups &amp; recovery</h3>
          <p className="small muted">A backup is created automatically at every server start and once a day (last 30 kept in <code>data/backups</code>). Uploaded files live in <code>data/uploads</code> — copy that folder too. To restore: stop the server and run the <code>.sql</code> backup file against the <code>tcaps</code> database (e.g. with the mysql client), then start again.</p>
          <ApiForm action="/api/settings/backup"><Submit className="btn sm">Create backup now</Submit></ApiForm>
          <ul className="timeline">{backups.slice(0, 15).map((b) => <li key={b}><a href={`/api/settings/backup/${encodeURIComponent(b)}`}>{b}</a></li>)}</ul></div>
        <div className="card"><h3>Contact messages</h3><ul className="timeline">
          {messages.map((m) => (
            <li key={m.id} className={m.handled ? 'muted' : ''}><strong>{m.name}</strong> · {m.email} {m.phone}<div style={{ whiteSpace: 'pre-line' }}>{m.body}</div><div className="small muted">{m.at.slice(0, 16)}</div>
              {!m.handled && <ApiForm action={`/api/messages/${m.id}/handled`}><Submit className="btn ghost sm">Mark handled</Submit></ApiForm>}</li>
          ))}
          {!messages.length && <li className="muted small">No messages.</li>}</ul></div>
      </div>
    </Page>
  );
}
