import { SERVICE_TYPES } from '@/lib/types';
import { RequestForm } from '../_components/request-form';

export const metadata = { title: 'Request Travel Assistance' };

export default async function RequestPage({ searchParams }: PageProps<'/request'>) {
  const q = await searchParams;
  const one = (k: string) => { const v = q[k]; return String(Array.isArray(v) ? v[0] : v ?? ''); };
  const service = one('service');
  const init: { service_type: string; d_origin?: string; d_destination?: string; d_trip_type?: string } = { service_type: SERVICE_TYPES.includes(service) ? service : '' };
  if (one('origin')) init.d_origin = one('origin').slice(0, 80);
  if (one('destination')) init.d_destination = one('destination').slice(0, 80);
  if (init.d_origin || init.d_destination) init.d_trip_type = 'One-way';
  return (
    <section className="section"><div className="wrap"><div className="formbox" style={{ marginTop: 0 }}>
      <h1>Request Travel Assistance</h1>
      <div className="notice">This form sends a request to our staff. <strong>It does not book or pay for anything.</strong> We will contact you with options and a quotation before anything is booked.</div>
      <RequestForm init={init} />
    </div></div></section>
  );
}
