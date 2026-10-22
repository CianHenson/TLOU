import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { labelOf } from '@/lib/forms';
import { intOrNull } from '@/lib/util';
import { Page } from '@/components/ui';
import { BookingForm } from '@/components/core-booking-form';
import { customerOptions, staffList } from '@/lib/queries/core';

export const metadata = { title: 'New booking' };

export default async function NewBooking(props: PageProps<'/app/bookings/new'>) {
  const me = await requireUser();
  const sp = await props.searchParams;
  const one = (k: string) => { const x = sp[k]; return Array.isArray(x) ? x[0] : x; };
  const rqId = intOrNull(one('request'));
  const rq = rqId ? await db.get('SELECT * FROM requests WHERE id=?', [rqId]) : undefined;
  let details = '';
  if (rq) {
    try {
      const labels = labelOf(rq.service_type);
      details = Object.entries(JSON.parse(rq.details) as Record<string, string>).filter(([k]) => !k.startsWith('contact_')).map(([k, x]) => `${labels[k] || k}: ${x}`).join('\n');
    } catch { /* ignore bad JSON */ }
  }
  const v = { status: 'Quoted', customer_id: rq ? rq.customer_id : one('customer') || '', request_id: rq ? rq.id : '', service_type: rq ? rq.service_type : '', assigned_to: me.id, details };
  const [customers, staff] = await Promise.all([customerOptions(), staffList()]);
  return <Page title="New booking"><BookingForm v={v} customers={customers} staff={staff} /></Page>;
}
