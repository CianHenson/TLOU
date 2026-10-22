import Link from 'next/link';
import type { Settings } from '@/lib/biz';

const isUrl = (s: string) => /^https?:\/\//.test(s);

export const Values = ({ S, mr = 6 }: { S: Settings; mr?: number }) => (
  <>{String(S.values || '').split(',').map((v) => v.trim()).filter(Boolean).map((v) => <span key={v} className="badge b-info" style={{ margin: `0 ${mr}px ${mr}px 0` }}>{v}</span>)}</>
);

export function ContactCard({ S, home }: { S: Settings; home?: boolean }) {
  return (
    <div className="card"><dl className="kv">
      {S.phone && <><dt>Phone</dt><dd>{S.phone}</dd></>}
      {S.mobile && <><dt>Mobile</dt><dd>{S.mobile}</dd></>}
      {S.email && <><dt>Email</dt><dd>{S.email}</dd></>}
      <dt>{home ? 'Visit us' : 'Address'}</dt><dd>{S.address}</dd>
      {S.hours && <><dt>Hours</dt><dd>{S.hours}</dd></>}
      {home
        ? (S.facebook_name || isUrl(S.facebook)) && <><dt>Facebook</dt><dd>{isUrl(S.facebook)
          ? <a href={S.facebook} rel="noopener noreferrer" target="_blank">{S.facebook_name || S.facebook}</a> : S.facebook_name}</dd></>
        : isUrl(S.facebook) && <><dt>Facebook</dt><dd><a href={S.facebook} rel="noopener noreferrer" target="_blank">{S.facebook}</a></dd></>}
      {isUrl(S.instagram) && <><dt>Instagram</dt><dd><a href={S.instagram} rel="noopener noreferrer" target="_blank">{S.instagram}</a></dd></>}
    </dl></div>
  );
}

export const PrivacyLink = () => <p><Link href="/privacy">Privacy policy</Link></p>;
