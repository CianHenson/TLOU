import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState, type FormEvent } from 'react';
import { get, post, put } from '../../../lib/api';
import { dateTime } from '../../../lib/format';
import { useFlash } from '../../../lib/flash';
import { usePageTitle } from '../../../lib/title';

interface Msg { id: number; name: string; email: string; phone: string; body: string; at: string; handled: number }
interface SettingsData { keys: string[]; longKeys: string[]; values: Record<string, string>; messages?: Msg[] }

const HINTS: Record<string, string> = {
  fares: 'One fare per line: Route|Amount, e.g. Manila to Palawan|2714',
  why: 'One point per line: Title|Description',
  partners: 'Comma-separated list',
  facebook: 'Full page link starting with https:// (shows as a clickable link)',
};
const TALL = ['privacy', 'about', 'fares', 'why'];
const label = (k: string) => k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());

// "Website Content" (mode=content) and "System Settings" (mode=system) share one screen, like the original.
export default function Settings({ mode }: { mode: 'content' | 'system' }) {
  usePageTitle(mode === 'content' ? 'Website Content' : 'System Settings');
  const qc = useQueryClient();
  const flash = useFlash();
  const { data } = useQuery({ queryKey: ['settings', mode], queryFn: () => get<SettingsData>(`/settings/${mode}`) });
  const [v, setV] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setV(data.values); }, [data]);
  if (!data) return <p className="muted">Loading…</p>;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await put('/settings', { mode, values: v });
      flash.ok('Saved.');
      qc.invalidateQueries({ queryKey: ['settings', mode] });
      qc.invalidateQueries({ queryKey: ['site'] }); // the public site reads these values
    } catch (err) {
      flash.err(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };
  const handled = async (id: number) => {
    await post(`/messages/${id}/handled`);
    qc.invalidateQueries({ queryKey: ['settings', 'system'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };

  return (
    <>
      <form className="card" onSubmit={save} style={{ maxWidth: 820 }}>
        <h3>{mode === 'content' ? 'Business details & website text' : 'Settings'}</h3>
        {data.keys.map((k) => (
          <div className="field" key={k}>
            <label htmlFor={`k-${k}`}>{label(k)}</label>
            {data.longKeys.includes(k)
              ? <textarea id={`k-${k}`} name={k} rows={TALL.includes(k) ? 8 : 2} value={v[k] ?? ''} onChange={(e) => setV((p) => ({ ...p, [k]: e.target.value }))} />
              : <input id={`k-${k}`} name={k} maxLength={400} value={v[k] ?? ''} onChange={(e) => setV((p) => ({ ...p, [k]: e.target.value }))} />}
            {HINTS[k] && <div className="small muted">{HINTS[k]}</div>}
          </div>
        ))}
        <button className="btn" disabled={busy}>{busy ? <><span className="spin" />Please wait…</> : 'Save'}</button>
      </form>

      {mode === 'system' && (
        <div className="grid g2" style={{ alignItems: 'start' }}>
          <div className="card"><h3>Data storage</h3>
            <p className="small muted">This build runs on <strong>hardcoded in-memory demo data</strong>, so there is no database file to back up or restore and changes are lost when the API restarts. The file backups of the original app (daily copies of <code>travel.db</code>) return when the real database is connected.</p>
            <p className="small muted">Uploaded files and the data retention period above apply once that database is in place.</p></div>
          <div className="card"><h3>Contact messages</h3><ul className="timeline">
            {data.messages?.map((m) => (
              <li key={m.id} className={m.handled ? 'muted' : ''}><strong>{m.name}</strong> · {m.email} {m.phone}
                <div style={{ whiteSpace: 'pre-line' }}>{m.body}</div><div className="small muted">{dateTime(m.at)}</div>
                {!m.handled && <button className="btn ghost sm" onClick={() => handled(m.id)}>Mark handled</button>}</li>
            ))}
            {!data.messages?.length && <li className="muted small">No messages.</li>}
          </ul></div>
        </div>
      )}
    </>
  );
}
