import { settings } from '@/lib/biz';

export const metadata = { title: 'Privacy Policy' };

export default async function Privacy() {
  const S = await settings();
  return (
    <section className="section"><div className="wrap" style={{ maxWidth: 820 }}>
      <h1>Privacy Policy</h1>
      <p style={{ whiteSpace: 'pre-line' }}>{S.privacy}</p>
      <h3>Data retention</h3>
      <p>Customer and transaction records are kept for up to {S.retention_years} years after the last transaction, or longer where required for accounting and tax purposes, then securely deleted or anonymized.</p>
      <h3>Your rights</h3>
      <p>You may request access to, correction of, or deletion of your personal data. Contact us at {[S.email, S.phones].filter(Boolean).join(' or ')}.</p>
    </div></section>
  );
}
