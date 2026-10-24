import Link from 'next/link';
import { settings } from '@/lib/biz';
import { Values } from '../_components/parts';

export const metadata = { title: 'About Us' };

export default async function About() {
  const S = await settings();
  return (
    <section className="section"><div className="wrap" style={{ maxWidth: 820 }}>
      <h1>About Us</h1>
      <p>{S.about}</p>
      <div className="grid g2" style={{ margin: '24px 0' }}>
        <div className="card"><h3>Our mission</h3><p>{S.mission}</p></div>
        <div className="card"><h3>Our vision</h3><p>{S.vision}</p></div>
      </div>
      <div className="card"><h3>Our values</h3><p><Values S={S} /></p></div>
      <div className="card"><h3>How it works</h3>
        <ol><li>Send us your travel requirements online, by phone, or in person.</li><li>We coordinate with airlines, hotels and suppliers and send you a quotation.</li><li>You confirm and pay (deposits are possible).</li><li>We process your booking and send your confirmation.</li></ol></div>
      <Link className="btn alt" href="/request">Request Travel Assistance</Link>
    </div></section>
  );
}
