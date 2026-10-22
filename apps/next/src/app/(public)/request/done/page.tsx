import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { settings } from '@/lib/biz';

export const metadata = { title: 'Request received' };

export default async function Done() {
  const ref = (await cookies()).get('lastref')?.value;
  if (!ref) redirect('/request');
  const S = await settings();
  return (
    <section className="section"><div className="wrap"><div className="formbox card" style={{ textAlign: 'center' }}>
      <h1>Request received</h1>
      <p>Thank you! Your travel assistance request has been submitted with the status <strong>Pending Review</strong>.</p>
      <div className="ref" aria-label="Reference number">{ref}</div>
      <p>Please keep this reference number and quote it when you contact us for updates.</p>
      <div className="notice">This is not a ticket, hotel reservation or payment confirmation. Our staff will contact you with options and a quotation.</div>
      <p style={{ marginTop: 18 }}>{[S.phones, S.email].filter(Boolean).join(' · ')}<br /><span className="muted small">{S.hours}</span></p>
      <Link className="btn" href="/">Back to home</Link>
    </div></div></section>
  );
}
