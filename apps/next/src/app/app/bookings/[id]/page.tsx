import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser, isOwner } from '@/lib/auth';
import { db } from '@/lib/db';
import { METHODS } from '@/lib/biz';
import { peso, today } from '@/lib/util';
import { Page } from '@/components/ui';
import { Notes } from '@/components/notes';
import { PrintButton } from '@/components/widgets';
import { ApiForm, Field, Submit } from '@/components/form';
import { loadBooking, notesFor, BK_BADGE, PAY_BADGE } from '@/lib/queries/core';

export const metadata = { title: 'Booking' };

export default async function BookingPage(props: PageProps<'/app/bookings/[id]'>) {
  const me = await requireUser();
  const { id } = await props.params;
  const b = await loadBooking(id);
  if (!b) notFound();
  const [payments, docs, notes, request] = await Promise.all([
    db.all(`SELECT p.*, u.name AS recorder FROM payments p LEFT JOIN users u ON u.id=p.user_id WHERE booking_id=? ORDER BY p.id DESC`, [b.id]),
    db.all(`SELECT d.*, u.name AS uploader FROM documents d LEFT JOIN users u ON u.id=d.user_id WHERE booking_id=? ORDER BY d.id DESC`, [b.id]),
    notesFor('booking', b.id),
    b.request_id ? db.get('SELECT id,ref FROM requests WHERE id=?', [b.request_id]) : Promise.resolve(undefined),
  ]);
  const owner = isOwner(me), td = today();
  return (
    <Page title={b.ref}>
      <div className="row spread"><div><span className={`badge ${BK_BADGE[b.status] ?? ''}`}>{b.status}</span> <span className={`badge ${PAY_BADGE[b.pay_status] ?? ''}`}>{b.pay_status}</span></div>
        <div className="row noprint"><Link className="btn ghost sm" href={`/app/bookings/${b.id}/edit`}>Edit booking</Link><PrintButton className="btn ghost sm">Print</PrintButton></div></div>
      <div className="grid g2" style={{ alignItems: 'start', marginTop: 14 }}>
        <div className="card"><h2>{b.ref}</h2>
          <dl className="kv">
            <dt>Customer</dt><dd><Link href={`/app/customers/${b.customer_id}`}>{b.customer}</Link> ({b.customer_code})</dd>
            <dt>Request</dt><dd>{request ? <Link href={`/app/requests/${request.id}`}>{request.ref}</Link> : '—'}</dd>
            <dt>Service</dt><dd>{b.service_type}</dd><dt>Supplier</dt><dd>{b.supplier || '—'}</dd><dt>Confirmation / ticket ref</dt><dd>{b.confirmation_ref || '—'}</dd>
            <dt>Assigned to</dt><dd>{b.employee || '—'}</dd><dt>Created</dt><dd>{b.created_at.slice(0, 16)}</dd>
          </dl>
          {b.details && <><h3 style={{ marginTop: 14 }}>Details</h3><p style={{ whiteSpace: 'pre-line' }}>{b.details}</p></>}
          {b.remarks && <><h3>Remarks</h3><p style={{ whiteSpace: 'pre-line' }}>{b.remarks}</p></>}
        </div>
        <div className="card"><h3>Money</h3>
          <dl className="kv"><dt>Selling price</dt><dd>{peso(b.selling_price)}</dd><dt>Service fee</dt><dd>{peso(b.service_fee)}</dd><dt>Discount</dt><dd>−{peso(b.discount)}</dd>
            <dt>Total payable</dt><dd><strong>{peso(b.total)}</strong></dd><dt>Payments received (net)</dt><dd>{peso(b.paid)}</dd>
            <dt>Outstanding balance</dt><dd><strong style={{ color: b.balance ? 'var(--err)' : 'var(--ok)' }}>{peso(b.balance)}</strong></dd>
            <dt>Supplier cost</dt><dd>{peso(b.supplier_cost)}</dd><dt>Gross margin</dt><dd>{peso(b.margin)}</dd></dl></div>
      </div>

      <div className="card"><h3>Payments &amp; refunds</h3>
        <div className="tw"><table><thead><tr><th>ID</th><th>Date</th><th>Type</th><th>Method</th><th>Reference</th><th className="num">Amount</th><th>By</th><th>Remarks</th><th></th></tr></thead><tbody>
          {payments.map((p) => (
            <tr key={p.id} className={p.status === 'Reversed' ? 'off' : ''}><td>{p.ref}</td><td>{p.paid_at}</td><td>{p.kind}{p.status === 'Reversed' ? ' — REVERSED' : ''}</td><td>{p.method}</td><td>{p.reference}</td>
              <td className="num">{p.kind === 'Refund' ? '−' : ''}{peso(p.amount)}</td><td>{p.recorder}</td><td>{p.status === 'Reversed' ? 'Reversed: ' + p.reversed_reason : p.remarks}</td>
              <td>{owner && p.status === 'Valid' && (
                <ApiForm action={`/api/payments/${p.id}/reverse`} className="row noprint">
                  <input name="reason" placeholder="Reason" required maxLength={500} style={{ width: 130 }} />
                  <Submit className="btn danger sm" confirm="Reverse this record? It will stop counting in totals.">Reverse</Submit>
                </ApiForm>
              )}</td></tr>
          ))}
          {!payments.length && <tr><td colSpan={9} className="empty">No payments recorded.</td></tr>}
        </tbody></table></div>
        <ApiForm action={`/api/bookings/${b.id}/payment`} reset className="noprint" style={{ marginTop: 14 }}>
          <h3>Record payment or refund</h3>
          <div className="grid g4">
            <Field name="kind" label="Type" type="select" options={['Payment', 'Refund']} emptyLabel={null} />
            <Field name="amount" label="Amount (₱) *" type="number" attrs={{ step: '0.01', min: 0.01, required: true }} />
            <Field name="paid_at" label="Date *" type="date" defaultValue={td} attrs={{ max: td, required: true }} />
            <Field name="method" label="Method *" type="select" options={METHODS} emptyLabel={null} attrs={{ required: true }} />
          </div>
          <div className="grid g2"><Field name="reference" label="Reference no." attrs={{ maxLength: 80 }} /><Field name="remarks" label="Remarks" attrs={{ maxLength: 500 }} /></div>
          <Submit>Record</Submit> <span className="muted small">Records cannot be deleted; mistakes are reversed by the owner with a reason.</span>
        </ApiForm>
      </div>

      <div className="grid g2" style={{ alignItems: 'start' }}>
        <div className="card"><h3>Supporting documents</h3>
          <ul className="timeline">
            {docs.map((d) => <li key={d.id}><a href={`/api/files/doc/${d.id}`}>{d.original}</a><div className="small muted">{d.uploader} · {d.at.slice(0, 16)}</div></li>)}
            {!docs.length && <li className="muted small">No documents.</li>}
          </ul>
          <ApiForm action={`/api/bookings/${b.id}/upload`} reset className="noprint">
            <input type="file" name="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" required /><p className="small muted">PDF, JPG, PNG or Word · max 5 MB</p><Submit className="btn sm">Upload</Submit>
          </ApiForm>
        </div>
        <Notes entity="booking" id={b.id} notes={notes} />
      </div>
    </Page>
  );
}
