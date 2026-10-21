import { Link } from 'react-router-dom';
import { useSite } from '../../lib/site';

export function About() {
  const { data } = useSite();
  if (!data) return null;
  const S = data.settings;
  return (
    <section className="section"><div className="wrap" style={{ maxWidth: 820 }}>
      <h1>About Us</h1>
      <p>{S.about}</p>
      <div className="grid g2" style={{ margin: '24px 0' }}>
        <div className="card"><h3>Our mission</h3><p>{S.mission}</p></div>
        <div className="card"><h3>Our vision</h3><p>{S.vision}</p></div>
      </div>
      <div className="card"><h3>Our values</h3>
        <p>{S.values.split(',').map((v) => <span key={v} className="badge b-info" style={{ marginRight: 6 }}>{v.trim()}</span>)}</p></div>
      <div className="card"><h3>How it works</h3>
        <ol>
          <li>Send us your travel requirements online, by phone, or in person.</li>
          <li>We coordinate with airlines, hotels and suppliers and send you a quotation.</li>
          <li>You confirm and pay (deposits are possible).</li>
          <li>We process your booking and send your confirmation.</li>
        </ol></div>
      <Link className="btn alt" to="/request">Request Travel Assistance</Link>
    </div></section>
  );
}

export function Services() {
  const { data } = useSite();
  if (!data) return null;
  return (
    <section className="section"><div className="wrap">
      <h1>Our Services</h1>
      <p className="muted">All services are arranged by our staff on your behalf. Submit a request and we will get back to you with options and a quotation.</p>
      <div className="cards">
        {data.services.map((s) => (
          <div key={s.id} className="svc">
            <div className="ic" aria-hidden="true">{s.icon}</div><h3>{s.name}</h3><p className="muted">{s.description}</p>
            <Link className="btn ghost sm" to={`/request?service=${encodeURIComponent(s.type)}`}>Request assistance →</Link>
          </div>
        ))}
      </div>
    </div></section>
  );
}

export function Privacy() {
  const { data } = useSite();
  if (!data) return null;
  const S = data.settings;
  return (
    <section className="section"><div className="wrap" style={{ maxWidth: 820 }}>
      <h1>Privacy Policy</h1>
      <p style={{ whiteSpace: 'pre-line' }}>{S.privacy}</p>
      <h3>Data retention</h3>
      <p>Customer and transaction records are kept for up to {S.retention_years} years after the last transaction, or longer where required for accounting and tax purposes, then securely deleted or anonymized.</p>
      <h3>Your rights</h3>
      <p>You may request access to, correction of, or deletion of your personal data. Contact us at {[S.email, S.phones].filter(Boolean).join(' or ')}.</p>
    </div></section>
  );
}
