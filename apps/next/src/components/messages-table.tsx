'use client';
// Messages inbox (owner / admin): what visitors send through the landing page's "Send us a message" form. Click a row (or use the
// three-dot menu) to read the whole message, reply by email and mark it handled. Messages are never deleted.
import { useState } from 'react';
import { dt12 } from '@/lib/util';
import { FootLine } from './foot-line';
import { KebabMenu } from './kebab-menu';
import { Modal, usePost } from './modal';

export interface MessageRow { id: number; name: string; email: string; phone: string; body: string; at: string; handled: number }

function View({ m, onClose }: { m: MessageRow; onClose: () => void }) {
  const { post, busy } = usePost();
  return (
    <Modal title={`Message from ${m.name}`} onClose={onClose} width={620}>
      {(close) => (
        <>
          <dl className="kv" style={{ marginTop: 0 }}>
            <dt>Received</dt><dd>{dt12(m.at)}</dd>
            <dt>Email</dt><dd><a href={`mailto:${m.email}`}>{m.email}</a></dd>
            <dt>Phone</dt><dd>{m.phone ? <a href={`tel:${m.phone.replace(/\s+/g, '')}`}>{m.phone}</a> : '—'}</dd>
            <dt>Status</dt><dd><span className={`badge ${m.handled ? 'b-ok' : 'b-warn'}`}>{m.handled ? 'Handled' : 'New'}</span></dd>
          </dl>
          <p style={{ whiteSpace: 'pre-line', overflowWrap: 'anywhere', margin: '0 0 16px', padding: '12px 14px', border: '1px solid var(--line)', borderRadius: 12 }}>{m.body}</p>
          <div className="row">
            <a className="btn" href={`mailto:${m.email}?subject=${encodeURIComponent('Re: your message to Alchemist Trip & Ride')}`}>Reply by email</a>
            <button type="button" className="btn ghost" disabled={busy} onClick={async () => { const d = await post(`/api/messages/${m.id}/handled`, { handled: m.handled ? '0' : '1' }); if (d.ok) close(); }}>
              {m.handled ? 'Mark as new' : 'Mark as handled'}
            </button>
            <button type="button" className="btn ghost" onClick={close}>Close</button>
          </div>
        </>
      )}
    </Modal>
  );
}

export function MessagesTable({ rows, total }: { rows: MessageRow[]; total: number }) {
  const [open, setOpen] = useState<MessageRow | null>(null);
  const { post, busy } = usePost();
  return (
    <div className="tw tw-fixed tw-fm">
      <table>
        <colgroup><col style={{ width: '14%' }} /><col style={{ width: '24%' }} /><col /><col style={{ width: '11%' }} /><col style={{ width: 56 }} /></colgroup>
        <thead><tr><th>Received</th><th>From</th><th>Message</th><th>Status</th><th></th></tr></thead>
        <tbody>
          {rows.map((m) => (
            <tr key={m.id} className={m.handled ? 'off' : ''} style={{ cursor: 'pointer' }} title="Click to read"
              onClick={(e) => { if (!(e.target as Element).closest('a, button')) setOpen(m); }}>
              <td className="nowrap small">{dt12(m.at)}</td>
              <td><strong>{m.name}</strong><div className="small muted" style={{ overflowWrap: 'anywhere' }}>{m.email}{m.phone ? ` · ${m.phone}` : ''}</div></td>
              <td style={{ overflowWrap: 'anywhere' }}><div style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{m.body}</div></td>
              <td><span className={`badge ${m.handled ? 'b-ok' : 'b-warn'}`}>{m.handled ? 'Handled' : 'New'}</span></td>
              <td className="nowrap" style={{ textAlign: 'right' }}>
                <KebabMenu label={`Actions for the message from ${m.name}`} items={[
                  { label: 'Read message', onClick: () => setOpen(m) },
                  { label: m.handled ? 'Mark as new' : 'Mark as handled', disabled: busy, onClick: () => post(`/api/messages/${m.id}/handled`, { handled: m.handled ? '0' : '1' }) },
                ]} />
              </td>
            </tr>
          ))}
          {!rows.length && <tr><td colSpan={5} className="empty"><strong>No messages yet.</strong><br /><span className="small muted">Messages sent through the landing page's "Send us a message" form appear here.</span></td></tr>}
          {!!rows.length && <tr className="fill"><td colSpan={5} /></tr>}
        </tbody>
        {!!rows.length && <FootLine cols={5} total={total} />}
      </table>
      {open && <View key={open.id + ':' + open.handled} m={open} onClose={() => setOpen(null)} />}
    </div>
  );
}
