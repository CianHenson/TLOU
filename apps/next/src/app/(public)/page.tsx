import Link from 'next/link';
import { db } from '@/lib/db';
import { settings } from '@/lib/biz';
import { peso } from '@/lib/util';
import type { Service } from '@/lib/types';
import { ContactForm } from './_components/contact-form';
import { ContactCard, Values } from './_components/parts';
import { Slideshow } from './_components/slideshow';

export const metadata = { title: 'Home' };

export default async function Home() {
  const S = await settings();
  const services = await db.all<Service>('SELECT * FROM services WHERE active=1 ORDER BY sort,id');
  return (
    <>
      <section className="hero" id="home"><div className="wrap">
        <div>
          <span className="eyebrow">{S.location}</span>
          <h1>Book smart. <em>Travel with confidence.</em></h1>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#e8c35e", margin: "0 0 .5em" }}>Explore More, Worry Less</p>
          <p className="lead"><strong style={{ color: '#fff' }}>{S.tagline}</strong> Flights, hotels and travel needs arranged by real people — from booking hanggang biyahe.</p>
          <div className="row"><Link className="btn big" href="/request">Request Travel Assistance</Link> <Link className="btn ghost big" href="/#fares">See promo fares</Link></div>
          <div className="hero-trust"><span><b>Easy</b> booking help</span><span><b>Affordable</b> options</span><span><b>Reliable</b> assistance</span></div>
        </div>
        <aside className="glass" aria-label="How it works">
          <h3>How it works</h3>
          <ol className="steps">
            <li><div><b>Send your request</b><span>Fill in the short form — no account needed.</span></div></li>
            <li><div><b>We source options</b><span>Our team checks airlines and hotels for you.</span></div></li>
            <li><div><b>Confirm &amp; we book</b><span>Approve the quotation, pay, and receive your confirmation.</span></div></li>
          </ol>
          <div className="note">Submitting a request does not confirm a ticket, reservation or payment.</div>
        </aside>
      </div></section>

      <section className="section alt" id="about"><div className="wrap" style={{ maxWidth: 900 }}>
        <div className="section-head"><span className="eyebrow">About us</span><h2>{S.business_name}</h2></div>
        <p style={{ fontSize: '1.05rem', whiteSpace: 'pre-line' }}>{S.about}</p>
        <div className="grid g2" style={{ margin: '24px 0' }}>
          <div className="card"><h3>Our mission</h3><p className="muted" style={{ margin: 0 }}>{S.mission}</p></div>
          <div className="card"><h3>Our vision</h3><p className="muted" style={{ margin: 0 }}>{S.vision}</p></div>
        </div>
        <p><Values S={S} /></p>
      </div></section>

      <section className="section" id="services"><div className="wrap">
        <div className="section-head"><span className="eyebrow">Services</span><h2>What we can help you with</h2>
          <p className="muted">All services are arranged by our team on your behalf. Submit a request and we will send options and a quotation.</p></div>
        <div className="cards">
          {services.map((s) => (
            <div className="svc" key={s.id}><div className="ic" aria-hidden="true">{s.icon}</div><h3>{s.name}</h3><p className="muted">{s.description}</p>
              <Link className="btn ghost sm" href={`/request?service=${encodeURIComponent(s.type)}`}>Request assistance →</Link></div>
          ))}
        </div>
      </div></section>
      <section className="section alt" id="rentals"><div className="wrap">
        <div className="section-head"><span className="eyebrow">Rent · Ride · Travel</span><h2>Car rentals &amp; van services</h2>
          <p className="muted">Cars, SUVs, pickups and vans for your trip, plus motorcycle service and camping gear for rent.</p></div>
        <Slideshow />
        <div className="cards" style={{ marginTop: 24 }}>
          <div className="svc"><h3>Vehicles</h3><p className="muted">Cars &amp; SUVs, pickup trucks, van service and motorcycle service.</p></div>
          <div className="svc"><h3>Camping gear for rent</h3><p className="muted">Camping tent, chair, table and mat.</p></div>
          <div className="svc"><h3>Travel assistance</h3><p className="muted">Domestic and international airfare, private seaplane, visa and immigration assistance, ferry booking, land transportation ticketing and travel insurance.</p></div>
        </div>
      </div></section>


      {S.fareList.length > 0 && (
        <section className="section alt" id="fares"><div className="wrap">
          <div className="section-head"><span className="eyebrow">Promo fares</span><h2>{S.fares_title || 'Lowest fares'}</h2>
            <p className="muted">{S.fares_note}</p></div>
          <div className="tw"><table className="fares"><thead><tr><th>Route</th><th className="num">One-way fare</th><th></th></tr></thead><tbody>
            {S.fareList.map((f) => (
              <tr key={f.route}><td><strong>{f.route}</strong></td><td className="num"><span className="price">{peso(f.cents)}</span></td>
                <td className="right"><Link className="btn sm" href={`/request?service=Domestic%20flight&origin=${encodeURIComponent(f.from)}&destination=${encodeURIComponent(f.to)}`}>Request this fare</Link></td></tr>
            ))}</tbody></table></div>
          {S.partnerList.length > 0 && <p className="partners"><span className="muted small">Airlines &amp; carriers we work with:</span> {S.partnerList.map((p) => <span key={p} className="chip">{p}</span>)}</p>}
        </div></section>
      )}

      {S.whyList.length > 0 && (
        <section className="section"><div className="wrap">
          <div className="section-head"><span className="eyebrow">Bakit mag-book sa travel agency?</span><h2>Guidance ka rin lalo na kung may tanong o aberya sa booking.</h2></div>
          <div className="cards why">
            {S.whyList.map((w) => <div className="svc" key={w.t}><h3>{w.t}</h3><p className="muted">{w.d}</p></div>)}
          </div>
        </div></section>
      )}

      <section className="section alt" id="contact"><div className="wrap">
        <div className="cta-band" style={{ marginBottom: 40 }}>
          <div><h2>Ready to plan your next trip?</h2><p>Send us your travel details and we will get back to you with options.</p></div>
          <Link className="btn big" href="/request">Request Travel Assistance</Link>
        </div>
        <div className="grid g2" style={{ alignItems: 'start' }}>
          <div><span className="eyebrow">Contact us</span><h2>Talk to us</h2>
            <ContactCard S={S} home />
            
          </div>
          <ContactForm showFlash />
        </div>
      </div></section>
    </>
  );
}
