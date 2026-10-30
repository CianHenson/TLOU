import { db } from '@/lib/db';
import type { Service } from '@/lib/types';
import { ServiceCard } from '../_components/service-card';

export const metadata = { title: 'Services' };

export default async function Services() {
  const services = await db.all<Service>('SELECT * FROM services WHERE active=1 ORDER BY sort,id');
  return (
    <section className="section"><div className="wrap">
      <h1>Our Services</h1>
      <p className="muted">All services are arranged by our staff on your behalf. Contact us and we will get back to you with options and a quotation.</p>
      <div className="svc2-grid">
        {services.map((s, k) => (
          <ServiceCard key={s.id} s={s} n={k + 1} />
        ))}
      </div>
    </div></section>
  );
}
