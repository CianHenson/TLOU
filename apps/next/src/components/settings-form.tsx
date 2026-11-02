// Shared by Website Content (mode 'content') and System Settings (mode 'system'). Posts to POST /api/settings.
import { ApiForm, Submit } from './form';
import { LONG_KEYS } from '@/lib/queries/owner';

const HINTS: Record<string, string> = {
  fares: 'One fare per line: Route|Amount, e.g. Manila to Palawan|2714',
  why: 'One point per line: Title|Description',
  partners: 'Comma-separated list',
  office_lat: 'Office latitude for Time In. In Google Maps, right-click the office pin and click the coordinates to copy. Leave blank to turn the location check off.',
  office_lng: 'Office longitude (the second number of the coordinates).',
  office_radius: 'Allowed distance from the office in metres (e.g. 150).',
  facebook: 'Full page link starting with https:// (shows as a clickable link)',
};

export function SettingsForm({ mode, keys, values }: { mode: 'content' | 'system'; keys: string[]; values: Record<string, unknown> }) {
  return (
    <ApiForm action="/api/settings" className="card" style={{ maxWidth: 820 }}>
      <input type="hidden" name="mode" value={mode} />
      <h3>{mode === 'content' ? 'Business details & website text' : 'Settings'}</h3>
      {keys.map((k) => {
        const v = String(values[k] ?? '');
        const label = k.replace(/_/g, ' ').replace(/^./, (c) => c.toUpperCase());
        return (
          <div className="field" key={k}><label htmlFor={`k-${k}`}>{label}</label>
            {LONG_KEYS.includes(k)
              ? <textarea id={`k-${k}`} name={k} rows={['privacy', 'about', 'fares', 'why'].includes(k) ? 8 : 2} defaultValue={v} />
              : <input id={`k-${k}`} name={k} defaultValue={v} maxLength={400} />}
            {HINTS[k] && <div className="small muted">{HINTS[k]}</div>}
          </div>
        );
      })}
      <Submit>Save</Submit>
    </ApiForm>
  );
}
