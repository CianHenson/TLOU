import Link from 'next/link';
import type { ReactNode } from 'react';
import { PublicNav } from '@/components/public-nav';
import { settings } from '@/lib/biz';
import { today } from '@/lib/util';
import { ContactIcons } from '@/components/contact-list';

export default async function PublicLayout({ children }: { children: ReactNode }) {
  const S = await settings();
  return (
    <div className="pub">
      <header className="pubhead"><div className="wrap">
        <Link className="logo" href="/"><span className="mark"><img src="/logo.png" alt="" /></span><span>{S.business_name}</span></Link>
        <PublicNav />
      </div></header>
      <main>{children}</main>
      <footer className="footer">
        <div className="fwrap cols fcols">
          <nav className="flinks" aria-label="Footer"><Link href="/#about">About Us</Link><Link href="/privacy">Privacy Policy</Link></nav>
          <ContactIcons S={S} />
        </div>
        <div className="fwrap fbar" style={{ justifyContent: 'center', textAlign: 'center' }}>
          <span>© {today().slice(0, 4)} {S.business_name}</span>
        </div>
      </footer>
    </div>
  );
}
