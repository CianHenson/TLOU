import Link from 'next/link';
import type { Settings } from '@/lib/biz';
import { ContactList } from '@/components/contact-list';

const isUrl = (s: string) => /^https?:\/\//.test(s);

export const Values = ({ S, mr = 6 }: { S: Settings; mr?: number }) => (
  <>{String(S.values || '').split(',').map((v) => v.trim()).filter(Boolean).map((v) => <span key={v} className="badge b-info" style={{ margin: `0 ${mr}px ${mr}px 0` }}>{v}</span>)}</>
);

export function ContactCard({ S, home }: { S: Settings; home?: boolean }) {
  return (
    <div className="card">
      <ContactList S={S} />
      {S.hours && <p className="small muted" style={{ marginTop: 14, marginBottom: 0 }}><strong>Hours:</strong> {S.hours}</p>}
      {isUrl(S.instagram) && <p className="small" style={{ marginBottom: 0 }}><a href={S.instagram} rel="noopener noreferrer" target="_blank">Instagram</a></p>}
      {home && <p className="small muted" style={{ marginTop: 10, marginBottom: 0 }}>Tap an icon to message us on WhatsApp or email.</p>}
    </div>
  );
}
export const PrivacyLink = () => <p><Link href="/privacy">Privacy policy</Link></p>;
