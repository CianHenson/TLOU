'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useScrollSpy } from './widgets';

const LINKS: [string, string][] = [['home', 'Home'], ['about', 'About Us'], ['services', 'Services'], ['fares', 'Promo Fares'], ['contact', 'Contact Us']];
const IDS = LINKS.map(([id]) => id);

export function PublicNav() {
  const spy = useScrollSpy(IDS);
  const onHome = usePathname() === '/';
  return (
    <nav className="nav" aria-label="Main">
      {LINKS.map(([id, label]) => <Link key={id} href={`/#${id}`} className={onHome && spy === id ? 'on' : ''}>{label}</Link>)}
      <Link href="/request" className="cta">Request Assistance</Link>
      <Link href="/login" className="muted small">Staff login</Link>
    </nav>
  );
}
