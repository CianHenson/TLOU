import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { db } from '@/lib/db';
import { settings } from '@/lib/biz';
import type { Service } from '@/lib/types';
import { ContactForm } from './_components/contact-form';
import { ContactCard, Values } from './_components/parts';
import { Slideshow } from './_components/slideshow';
import { CustomerGallery } from './_components/customer-gallery';
import { ServiceCard } from './_components/service-card';
import { Carriers } from './_components/carriers';

export const metadata = { title: 'Home' };

/** Photos dropped into public/customers/ (any image, sorted by file name); a placeholder shows while it is empty. */
async function customerPhotos() {
  const files = await readdir(path.join(process.cwd(), 'public', 'customers')).catch(() => [] as string[]);
  return files.filter((f) => /\.(jpe?g|png|webp|avif)$/i.test(f))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((f) => `/customers/${encodeURIComponent(f)}`);
}

export default async function Home() {
  const S = await settings();
  const services = await db.all<Service>('SELECT * FROM services WHERE active=1 ORDER BY sort,id');
  const photos = await customerPhotos();
  return (
    <>
      <section className="hero" id="home"><div className="wrap">
        <div>
          <span className="eyebrow">{S.location}</span>
          <h1>Book smart. <em>Travel with confidence.</em></h1>
          <p style={{ fontSize: "1.5rem", fontWeight: 700, color: "#e8c35e", margin: "0 0 .5em" }}>Explore More, Worry Less</p>
          <p className="lead"><strong style={{ color: '#fff' }}>{S.tagline}</strong> Flights, hotels and travel needs arranged by real people — from booking hanggang biyahe.</p>
          <div className="hero-trust"><span><b>Easy</b> booking help</span><span><b>Affordable</b> options</span><span><b>Reliable</b> assistance</span></div>
        </div>
        <aside className="glass" aria-label="How it works">
          <h3>How it works</h3>
          <ol className="steps">
            <li><div><b>Tell us your plans</b><span>Message us on Facebook, call or visit — no forms, no account needed.</span></div></li>
            <li><div><b>We find your best options</b><span>Flights, hotels and car or van rentals that fit your dates and budget.</span></div></li>
            <li><div><b>Confirm &amp; we book</b><span>Every cost is shown upfront. Approve, pay, and get your confirmation.</span></div></li>
            <li><div><b>We&apos;re with you until the biyahe</b><span>Delays or changes? A real person who knows your trip will help.</span></div></li>
          </ol>
          <div className="note">Messaging us does not yet confirm a ticket, reservation or payment.</div>
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
          <p className="muted">All services are arranged by our team on your behalf. Contact us and we will send options and a quotation.</p></div>
        <div className="svc2-grid">
          {services.map((s, k) => (
            <ServiceCard key={s.id} s={s} n={k + 1} />
          ))}
        </div>
        <Carriers />
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


      {S.whyList.length > 0 && (
        <section className="section"><div className="wrap">
          <div className="section-head" style={{ marginInline: 'auto', textAlign: 'center' }}><span className="eyebrow">Bakit mag-book sa travel agency?</span><h2>Guidance ka rin lalo na kung may tanong o aberya sa booking.</h2></div>
          <div className="cards why">
            {S.whyList.map((w) => <div className="svc" key={w.t}><h3>{w.t}</h3><p className="muted">{w.d}</p></div>)}
          </div>
        </div></section>
      )}

      <section className="section" id="customers"><div className="wrap">
        <div className="section-head"><span className="eyebrow">Happy travelers</span><h2>Our customers</h2>
          <p className="muted">Real trips we arranged — thank you for traveling with us.</p></div>
        <CustomerGallery photos={photos} />
      </div></section>

      <section className="section alt" id="contact"><div className="wrap">
        <div className="cta-band" style={{ marginBottom: 40 }}>
          <div><h2>Ready to plan your next trip?</h2><p>Send us your travel details and we will get back to you with options.</p></div>
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
