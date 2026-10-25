import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { plain, today } from '@/lib/util';
import { Page } from '@/components/ui';
import { AirfareForm } from '@/components/airfare-form';

export const metadata = { title: 'Edit airfare sale' };

export default async function EditAirfare({ params }: PageProps<'/app/airfare/[id]'>) {
  await requireUser();
  const { id } = await params;
  const r = /^\d+$/.test(id) ? await db.get('SELECT * FROM airfare_sales WHERE id=?', [id]) : undefined;
  if (!r) notFound();
  return (
    <Page title={`PNR ${r.pnr}`}>
      <AirfareForm today={today()} a={{ id: r.id, txn_date: r.txn_date, airline: r.airline, pnr: r.pnr, pax: r.pax, passenger: r.passenger, contact: r.contact ?? '',
        email_fb: r.email_fb ?? '', origin: r.origin, destination: r.destination, travel_date: r.travel_date, travel_time: r.travel_time ?? '',
        checkin_status: r.checkin_status, flight_no: r.flight_no ?? '', total_amount: plain(r.total_amount), service_charge: plain(r.service_charge),
        card_fee: plain(r.card_fee), remarks: r.remarks ?? '' }} />
    </Page>
  );
}
