import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useSite } from '../lib/site';

const LINKS: [string, string][] = [['home', 'Home'], ['about', 'About Us'], ['services', 'Services'], ['fares', 'Promo Fares'], ['contact', 'Contact Us']];
const isUrl = (s: unknown) => typeof s === 'string' && /^https?:\/\//.test(s);

export default function PublicLayout() {
  const { data } = useSite();
  const S = data?.settings;
  const loc = useLocation();
  const [active, setActive] = useState('');

  useEffect(() => {
    document.body.classList.add('pub');
    return () => document.body.classList.remove('pub');
  }, []);

  // Scroll to the #section in the URL (the home page is one long page), else to the top.
  useEffect(() => {
    if (loc.hash) setTimeout(() => document.getElementById(loc.hash.slice(1))?.scrollIntoView(), 0);
    else window.scrollTo(0, 0);
  }, [loc.pathname, loc.hash, !!data]);

  // Highlight the nav link of the section currently in view (home page only).
  useEffect(() => {
    setActive('');
    if (loc.pathname !== '/' || !('IntersectionObserver' in window)) return;
    const secs = LINKS.map(([id]) => document.getElementById(id)).filter((x): x is HTMLElement => !!x);
    const seen = new Map<string, boolean>();
    const io = new IntersectionObserver((es) => {
      es.forEach((e) => seen.set(e.target.id, e.isIntersecting));
      const cur = secs.filter((s) => seen.get(s.id)).pop();
      if (cur) setActive(cur.id);
    }, { rootMargin: '-40% 0px -55% 0px' });
    secs.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, [loc.pathname, !!data]);

  if (!S) return <p className="wrap muted" style={{ padding: '40px 20px' }}>Loading…</p>;

  return (
    <>
      <header className="pubhead"><div className="wrap">
        <Link className="logo" to="/"><i>✈</i><span>{S.business_name}</span></Link>
        <nav className="nav" aria-label="Main">
          {LINKS.map(([id, label]) => (
            <Link key={id} to={`/#${id}`} className={active === id ? 'on' : ''}>{label}</Link>
          ))}
          <Link to="/request" className="cta">Request Assistance</Link>
          <Link to="/login" className="muted small">Staff login</Link>
        </nav>
      </div></header>

      <main><Outlet /></main>

      <footer className="footer">
        <div className="fwrap cols">
          <div>
            <Link className="logo" to="/"><i>✈</i><span>{S.business_name}</span></Link>
            <p className="muted-d">{S.tagline}</p>
          </div>
          <div><h4>Contact</h4><ul>
            {S.phones && <li>{S.phones}</li>}
            {S.email && <li>{S.email}</li>}
            <li>{S.address}</li>
            {isUrl(S.facebook)
              ? <li><a href={S.facebook} target="_blank" rel="noopener noreferrer">Facebook: {S.facebook_name || 'Our page'}</a></li>
              : S.facebook_name && <li>Facebook: {S.facebook_name}</li>}
          </ul></div>
          <div><h4>Office hours</h4><p className="muted-d">{S.hours || 'Message or call us to confirm our schedule.'}</p></div>
        </div>
        <div className="fwrap fbar">
          <nav className="flinks" aria-label="Footer">
            {LINKS.map(([id, label]) => <Link key={id} to={`/#${id}`}>{label}</Link>)}
            <Link to="/request">Request Assistance</Link>
            <Link to="/privacy">Privacy Policy</Link>
          </nav>
          <span>© {new Date().getFullYear()} {S.business_name}</span>
        </div>
      </footer>
    </>
  );
}
