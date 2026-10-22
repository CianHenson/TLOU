import Link from 'next/link';
import type { ReactNode } from 'react';
import { PublicNav } from '@/components/public-nav';
import { settings } from '@/lib/biz';
import { today } from '@/lib/util';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const S = await settings();
  return (
    <div className="pub">
      <header className="pubhead"><div className="wrap">
        <Link className="logo" href="/"><i>✈</i><span>{S.business_name}</span></Link>
        <PublicNav />
      </div></header>
      <main>{children}</main>
      <footer className="footer">
        <div className="fwrap cols">
          <div><Link className="logo" href="/"><i>✈</i><span>{S.business_name}</span></Link><p className="muted-d">{S.tagline}</p></div>
          <div><h4>Contact</h4><ul>
            {S.phones && <li>{S.phones}</li>}{S.email && <li>{S.email}</li>}<li>{S.address}</li>
            {/^https?:\/\//.test(S.facebook)
              ? <li><a href={S.facebook} target="_blank" rel="noopener noreferrer">Facebook: {S.facebook_name || 'Our page'}</a></li>
              : S.facebook_name ? <li>Facebook: {S.facebook_name}</li> : null}
          </ul></div>
          <div><h4>Office hours</h4><p className="muted-d">{S.hours || 'Message or call us to confirm our schedule.'}</p></div>
        </div>
        <div className="fwrap fbar">
          <nav className="flinks" aria-label="Footer">
            <Link href="/#home">Home</Link><Link href="/#about">About Us</Link><Link href="/#services">Services</Link><Link href="/#fares">Promo Fares</Link>
            <Link href="/#contact">Contact Us</Link><Link href="/request">Request Assistance</Link><Link href="/privacy">Privacy Policy</Link>
          </nav>
          <span>© {today().slice(0, 4)} {S.business_name}</span>
        </div>
      </footer>
    </div>
  );
}
