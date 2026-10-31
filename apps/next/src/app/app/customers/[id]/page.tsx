import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { bookingSelect, decorate } from '@/lib/biz';
import { peso } from '@/lib/util';
import { Page, dt } from '@/components/ui';
import { Notes } from '@/components/notes';
import { custBalance, notesFor } from '@/lib/queries/core';

export const metadata = { title: 'Customer' };

export default async function CustomerPage(props: PageProps<'/app/customers/[id]'>) {
  await requireUser();
  const { id } = await props.params;
  const c = await db.get(`SELECT c.*, ${custBalance} AS balance FROM customers c WHERE id=?`, [id]);
  if (!c) notFound();
  const [bookingRows, requests, payments, notes] = await Promise.all([
    db.all(`${bookingSelect} WHERE b.customer_id=? ORDER BY b.id DESC`, [c.id]),
    db.all('SELECT * FROM requests WHERE customer_id=? ORDER BY id DESC', [c.id]),
    db.all(`SELECT p.*, b.ref AS booking_ref FROM payments p JOIN bookings b ON b.id=p.booking_id WHERE p.customer_id=? ORDER BY p.id DESC`, [c.id]),
    notesFor('customer', c.id),
  ]);
  const bookings = bookingRows.map(decorate);
  return (
    <Page title={c.name}>
      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card">
          <div className="row spread"><h2>{c.name} <span className="muted small">{c.code}</span></h2><Link className="btn ghost sm" href={`/app/customers/${c.id}/edit`}>Edit</Link></div>
          <dl className="kv">
            <dt>Phone</dt><dd>{c.phone || '—'}</dd><dt>Email</dt><dd>{c.email || '—'}</dd><dt>Preferred</dt><dd>{c.pref_contact || '—'}</dd><dt>Registered</dt><dd>{dt(c.created_at)}</dd>
            <dt>Outstanding</dt><dd><strong>{peso(c.balance)}</strong></dd>
          </dl>
          {c.notes && <p className="small muted" style={{ whiteSpace: 'pre-line' }}>{c.notes}</p>}
        </div>
        <Notes entity="customer" id={c.id} notes={notes} />
      </div>
      <h2>Bookings</h2>
      <div className="tw"><table><thead><tr><th>Ref</th><th>Service</th><th>Status</th><th className="num">Total</th><th className="num">Paid</th><th className="num">Balance</th></tr></thead><tbody>
        {bookings.map((b) => <tr key={b.id}><td>{b.ref}</td><td>{b.service_type}</td><td><span className="badge">{b.status}</span></td><td className="num">{peso(b.total)}</td><td className="num">{peso(b.paid)}</td><td className="num">{peso(b.balance)}</td></tr>)}
        {!bookings.length && <tr><td colSpan={6} className="empty">No bookings yet.</td></tr>}
      </tbody></table></div>
      <h2 style={{ marginTop: 22 }}>Travel requests</h2>
      <div className="tw"><table><thead><tr><th>Ref</th><th>Service</th><th>Status</th><th>Received</th></tr></thead><tbody>
        {requests.map((r) => <tr key={r.id}><td>{r.ref}</td><td>{r.service_type}</td><td><span className="badge">{r.status}</span></td><td>{dt(r.created_at)}</td></tr>)}
        {!requests.length && <tr><td colSpan={4} className="empty">No requests yet.</td></tr>}
      </tbody></table></div>
      <h2 style={{ marginTop: 22 }}>Payment history</h2>
      <div className="tw"><table><thead><tr><th>ID</th><th>Date</th><th>Booking</th><th>Type</th><th>Method</th><th className="num">Amount</th></tr></thead><tbody>
        {payments.map((p) => <tr key={p.id} className={p.status === 'Reversed' ? 'off' : ''}><td>{p.ref}</td><td>{p.paid_at}</td><td>{p.booking_ref}</td><td>{p.kind}{p.status === 'Reversed' ? ' (reversed)' : ''}</td><td>{p.method}</td><td className="num">{p.kind === 'Refund' ? '−' : ''}{peso(p.amount)}</td></tr>)}
        {!payments.length && <tr><td colSpan={6} className="empty">No payments yet.</td></tr>}
      </tbody></table></div>
    </Page>
  );
}
