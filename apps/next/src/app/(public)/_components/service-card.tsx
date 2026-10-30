import type { ReactNode } from 'react';
import type { Service } from '@/lib/types';

// Line icons per service type (matched on keywords in `services.type`); unknown types fall back to the emoji stored on the service.
const ICONS: [RegExp, ReactNode][] = [
  [/international/i, <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>],
  [/flight|air/i, <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />],
  [/hotel/i, <path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h1M14 9h1M9 13h1M14 13h1M10 21v-4h4v4" />],
  [/package/i, <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M8 12v4M16 12v4" /></>],
  [/group/i, <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />],
  [/other/i, <><circle cx="12" cy="12" r="10" /><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36z" /></>],
];

/** Service card for the landing and Services pages: icon tile, running number, title and description. */
export function ServiceCard({ s, n }: { s: Pick<Service, 'type' | 'name' | 'description' | 'icon'>; n: number }) {
  const icon = ICONS.find(([re]) => re.test(s.type))?.[1];
  return (
    <article className="svc2">
      <div className="svc2-top">
        <div className="svc2-ic" aria-hidden="true">
          {icon ? <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{icon}</svg> : s.icon}
        </div>
        <span className="svc2-n" aria-hidden="true">{String(n).padStart(2, '0')}</span>
      </div>
      <h3>{s.name}</h3>
      <p>{s.description}</p>
    </article>
  );
}
