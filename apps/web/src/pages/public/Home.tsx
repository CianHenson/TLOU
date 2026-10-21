import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { post } from '../../lib/api';
import { peso } from '../../lib/format';
import { useForm } from '../../lib/form';
import { useSite } from '../../lib/site';
import Field, { CheckField } from '../../ui/Field';

const isUrl = (s: unknown) => typeof s === 'string' && /^https?:\/\//.test(s);

function ContactForm() {
  const f = useForm({ name: '', email: '', phone: '', body: '', consent: false, website: '' });
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    f.reset();
    try {
      await post('/public/contact', f.v);
      setSent(true);
      f.setV({ name: '', email: '', phone: '', body: '', consent: false, website: '' });
    } catch (err) {
      setSent(false);
      f.fail(err);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="card" onSubmit={submit} noValidate>
      <h2>Send us a message</h2>
      {sent && <div className="flash ok" role="status">Thank you! Your message was sent. We will get back to you soon.</div>}
      {f.message && !sent && <div className="flash err" role="alert">{f.message}</div>}
      <div className="hp" aria-hidden="true">
        <input name="website" tabIndex={-1} autoComplete="off" value={f.v.website} onChange={(e) => f.setV((p) => ({ ...p, website: e.target.value }))} />
      </div>
      <Field label="Full name" required maxLength={120} {...f.bind('name')} />
      <Field label="Email" type="email" required maxLength={160} {...f.bind('email')} />
      <Field label="Phone (optional)" maxLength={40} {...f.bind('phone')} />
      <Field label="Message" type="textarea" required maxLength={3000} {...f.bind('body')} />
      <CheckField
        name="consent" checked={f.v.consent} error={f.errors.consent}
        onChange={(c) => f.setV((p) => ({ ...p, consent: c }))}
        label={<>I agree to the <Link to="/privacy" target="_blank">privacy notice</Link>.</>}
      />
      <button className="btn" disabled={busy}>{busy ? <><span className="spin" />Please wait…</> : 'Send message'}</button>
    </form>
  );
}

export default function Home() {
  const { data } = useSite();
  if (!data) return null;
  const { settings: S, services } = data;

  return (
    <>
      <section className="hero" id="home"><div className="wrap">
        <div>
          <span className="eyebrow">{S.location}</span>
          <h1>Book smart. <em>Travel with confidence.</em></h1>
          <p className="lead"><strong style={{ color: '#fff' }}>{S.tagline}</strong> Flights, hotels and travel needs arranged by real people — from booking hanggang biyahe.</p>
          <div className="row">
            <Link className="btn big" to="/request">Request Travel Assistance</Link>{' '}
            <Link className="btn ghost big" to="/#fares">See promo fares</Link>
          </div>
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
        <p>{S.values.split(',').map((v) => <span key={v} className="badge b-info" style={{ margin: '0 6px 6px 0' }}>{v.trim()}</span>)}</p>
      </div></section>

      <section className="section" id="services"><div className="wrap">
        <div className="section-head"><span className="eyebrow">Services</span><h2>What we can help you with</h2>
          <p className="muted">All services are arranged by our team on your behalf. Submit a request and we will send options and a quotation.</p></div>
        <div className="cards">
          {services.map((s) => (
            <div key={s.id} className="svc">
              <div className="ic" aria-hidden="true">{s.icon}</div><h3>{s.name}</h3><p className="muted">{s.description}</p>
              <Link className="btn ghost sm" to={`/request?service=${encodeURIComponent(s.type)}`}>Request assistance →</Link>
            </div>
          ))}
        </div>
      </div></section>

      {S.fareList.length > 0 && (
        <section className="section alt" id="fares"><div className="wrap">
          <div className="section-head"><span className="eyebrow">Promo fares</span><h2>{S.fares_title || 'Lowest fares'}</h2><p className="muted">{S.fares_note}</p></div>
          <div className="tw"><table className="fares"><thead><tr><th>Route</th><th className="num">One-way fare</th><th /></tr></thead><tbody>
            {S.fareList.map((f) => (
              <tr key={f.route}>
                <td><strong>{f.route}</strong></td>
                <td className="num"><span className="price">{peso(f.cents)}</span></td>
                <td className="right"><Link className="btn sm" to={`/request?service=Domestic%20flight&origin=${encodeURIComponent(f.from)}&destination=${encodeURIComponent(f.to)}`}>Request this fare</Link></td>
              </tr>
            ))}
          </tbody></table></div>
          {S.partnerList.length > 0 && (
            <p className="partners"><span className="muted small">Airlines &amp; carriers we work with:</span> {S.partnerList.map((p) => <span key={p} className="chip">{p}</span>)}</p>
          )}
        </div></section>
      )}

      {S.whyList.length > 0 && (
        <section className="section"><div className="wrap">
          <div className="section-head"><span className="eyebrow">Bakit mag-book sa travel agency?</span><h2>Guidance ka rin lalo na kung may tanong o aberya sa booking.</h2></div>
          <div className="cards why">
            {S.whyList.map((w) => <div key={w.t} className="svc"><h3>{w.t}</h3><p className="muted">{w.d}</p></div>)}
          </div>
        </div></section>
      )}

      <section className="section alt" id="contact"><div className="wrap">
        <div className="cta-band" style={{ marginBottom: 40 }}>
          <div><h2>Ready to plan your next trip?</h2><p>Send us your travel details and we will get back to you with options.</p></div>
          <Link className="btn big" to="/request">Request Travel Assistance</Link>
        </div>
        <div className="grid g2" style={{ alignItems: 'start' }}>
          <div><span className="eyebrow">Contact us</span><h2>Talk to us</h2>
            <div className="card"><dl className="kv">
              {S.phone && <><dt>Phone</dt><dd>{S.phone}</dd></>}
              {S.mobile && <><dt>Mobile</dt><dd>{S.mobile}</dd></>}
              {S.email && <><dt>Email</dt><dd>{S.email}</dd></>}
              <dt>Visit us</dt><dd>{S.address}</dd>
              {S.hours && <><dt>Hours</dt><dd>{S.hours}</dd></>}
              {(S.facebook_name || isUrl(S.facebook)) && (
                <><dt>Facebook</dt><dd>{isUrl(S.facebook)
                  ? <a href={S.facebook} rel="noopener noreferrer" target="_blank">{S.facebook_name || S.facebook}</a> : S.facebook_name}</dd></>
              )}
              {isUrl(S.instagram) && <><dt>Instagram</dt><dd><a href={S.instagram} rel="noopener noreferrer" target="_blank">{S.instagram}</a></dd></>}
            </dl></div>
            <p><Link to="/privacy">Privacy policy</Link></p>
          </div>
          <ContactForm />
        </div>
      </div></section>
    </>
  );
}
