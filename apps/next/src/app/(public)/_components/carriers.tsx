import { readdir } from 'node:fs/promises';
import path from 'node:path';
import type { CSSProperties } from 'react';

/**
 * Airlines and sea carriers we book with. Each shows its logo from public/partners/ when a file named after its key
 * exists (e.g. airasia.png, cebu-pacific.svg), otherwise its name as text, so the strip works before logos are added.
 * `bleed`: the logo file is a solid-colour block cut to the tile's shape (420x152) and fills the tile edge to edge.
 * Logos are grey and light up in colour one by one, 1 s each (theme.css `car-hl`, timed for these 4 entries).
 */
const CARRIERS = [
  { key: 'philippine-airlines', name: 'Philippine Airlines' },
  { key: 'cebu-pacific', name: 'Cebu Pacific', bleed: true },
  { key: 'airasia', name: 'AirAsia', bleed: true },
  { key: '2go', name: '2GO Travel' },
];

export async function Carriers() {
  const files = await readdir(path.join(process.cwd(), 'public', 'partners')).catch(() => [] as string[]);
  const logo = (key: string) => files.find((f) => new RegExp(`^${key}\\.(svg|png|webp|jpe?g|avif)$`, 'i').test(f));
  return (
    <div className="carriers">
      <p className="carriers-title">Airlines &amp; sea carriers we book with</p>
      <ul>
        {CARRIERS.map((c, i) => {
          const f = logo(c.key);
          return (
            <li key={c.key} title={c.name} className={f && c.bleed ? 'bleed' : undefined} style={{ '--i': i } as CSSProperties}>
              {f ? <img src={`/partners/${encodeURIComponent(f)}`} alt={c.name} loading="lazy" /> : <span>{c.name}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
