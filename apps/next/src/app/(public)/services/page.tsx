import Link from 'next/link';
import { db } from '@/lib/db';
import type { Service } from '@/lib/types';

export const metadata = { title: 'Services' };

export default async function Services() {
  const services = await db.all<Service>('SELECT * FROM services WHERE active=1 ORDER BY sort,id');
  return (
    <section className="section"><div className="wrap">
      <h1>Our Services</h1>
      <p className="muted">All services are arranged by our staff on your behalf. Submit a request and we will get back to you with options and a quotation.</p>
      <div className="cards">
        {services.map((s) => (
          <div className="svc" key={s.id}><div className="ic" aria-hidden="true">{s.icon}</div><h3>{s.name}</h3><p className="muted">{s.description}</p>
            <Link className="btn" href={`/request?service=${encodeURIComponent(s.type)}`}>Request assistance</Link></div>
        ))}
      </div>
    </div></section>
  );
}
