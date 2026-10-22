import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { plain } from '@/lib/util';
import { Page } from '@/components/ui';
import { BookingForm } from '@/components/core-booking-form';
import { customerOptions, staffList, loadBooking } from '@/lib/queries/core';

export const metadata = { title: 'Edit booking' };

export default async function EditBooking(props: PageProps<'/app/bookings/[id]/edit'>) {
  await requireUser();
  const { id } = await props.params;
  const b = await loadBooking(id);
  if (!b) notFound();
  const [customers, staff] = await Promise.all([customerOptions(), staffList()]);
  const v = { ...b, supplier_cost: plain(b.supplier_cost), selling_price: plain(b.selling_price), service_fee: plain(b.service_fee), discount: plain(b.discount) };
  return <Page title={'Edit ' + b.ref}><BookingForm v={v} id={b.id} customers={customers} staff={staff} customerLink={{ id: b.customer_id, name: b.customer }} /></Page>;
}
